"""
Lead validation loop — the agent's self-correction engine.

For each lead targeted by the current strategy:
  1. Tavily fact-checks the claimed tech stack
  2. SLM scores the lead (0-100) and detects mismatches
  3. Mismatches produce Lesson + Evidence nodes in Neo4j
  4. If >60% of leads fail, triggers a strategy pivot
"""

import uuid
from datetime import datetime, timezone

from services.neo4j_service import get_session
from services.tavily_service import fact_check_lead
from services.slm_service import score_lead

FAILURE_THRESHOLD = 0.6
SCORE_PASS_THRESHOLD = 50


def _get_current_strategy() -> dict | None:
    """Fetch the latest strategy by version number."""
    with get_session() as session:
        result = session.run(
            "MATCH (s:Strategy) RETURN s {.*} AS strategy "
            "ORDER BY s.version DESC LIMIT 1"
        )
        record = result.single()
        return dict(record["strategy"]) if record else None


def _get_leads_for_strategy(version: int) -> list[dict]:
    """Fetch all Company nodes targeted by a given strategy version."""
    with get_session() as session:
        result = session.run(
            """
            MATCH (s:Strategy {version: $version})-[:TARGETS]->(c:Company)
            RETURN c {.*} AS company
            """,
            version=version,
        )
        return [dict(r["company"]) for r in result]


def _update_lead_score(domain: str, score: int):
    """Update the score field on a Company node."""
    with get_session() as session:
        session.run(
            "MATCH (c:Company {domain: $domain}) SET c.score = $score",
            domain=domain,
            score=score,
        )


def _store_evidence(company_domain: str, source_url: str, summary: str):
    """Create an Evidence node and link it to the Company."""
    with get_session() as session:
        session.run(
            """
            MATCH (c:Company {domain: $domain})
            MERGE (e:Evidence {source_url: $url})
            ON CREATE SET e.summary = $summary,
                          e.retrieved_at = datetime($now)
            MERGE (c)-[:HAS_EVIDENCE]->(e)
            """,
            domain=company_domain,
            url=source_url,
            summary=summary,
            now=datetime.now(timezone.utc).isoformat(),
        )


def _store_lesson(company_domain: str, mismatch_type: str, details: str):
    """Create a Lesson node and link it to the Company."""
    lesson_id = f"les-{uuid.uuid4().hex[:8]}"
    with get_session() as session:
        session.run(
            """
            MATCH (c:Company {domain: $domain})
            CREATE (l:Lesson {
                lesson_id: $lesson_id,
                type: $type,
                details: $details,
                timestamp: datetime($now)
            })
            CREATE (c)-[:LEARNED_FROM]->(l)
            """,
            domain=company_domain,
            lesson_id=lesson_id,
            type=mismatch_type,
            details=details,
            now=datetime.now(timezone.utc).isoformat(),
        )


def _store_pivot_lesson(details: str):
    """Create a strategy-level SegmentPivot lesson linked to the latest strategy."""
    lesson_id = f"les-{uuid.uuid4().hex[:8]}"
    with get_session() as session:
        session.run(
            """
            MATCH (s:Strategy)
            WITH s ORDER BY s.version DESC LIMIT 1
            CREATE (l:Lesson {
                lesson_id: $lesson_id,
                type: 'SegmentPivot',
                details: $details,
                timestamp: datetime($now)
            })
            CREATE (s)-[:LEARNED_FROM]->(l)
            """,
            lesson_id=lesson_id,
            details=details,
            now=datetime.now(timezone.utc).isoformat(),
        )


async def validate_single_lead(company: dict, icp: str) -> dict:
    """
    Validate one lead: fact-check → score → store results.

    Returns:
        {
            "company": str,
            "domain": str,
            "old_score": int,
            "new_score": int,
            "passed": bool,
            "mismatch_type": str | None,
            "reasoning": str,
            "evidence_count": int,
        }
    """
    name = company["name"]
    domain = company["domain"]
    tech_stack = company.get("tech_stack", [])
    old_score = company.get("score", 0)

    evidence = await fact_check_lead(name, tech_stack)

    scoring = await score_lead(company, evidence, icp)
    new_score = scoring.get("score", 0)
    mismatch_type = scoring.get("mismatch_type")
    mismatch_details = scoring.get("mismatch_details")
    reasoning = scoring.get("reasoning", "")

    _update_lead_score(domain, new_score)

    for source in evidence.get("sources", []):
        if source.get("url"):
            _store_evidence(domain, source["url"], source.get("summary", ""))

    if mismatch_type and mismatch_details:
        _store_lesson(domain, mismatch_type, mismatch_details)

    passed = new_score >= SCORE_PASS_THRESHOLD

    return {
        "company": name,
        "domain": domain,
        "old_score": old_score,
        "new_score": new_score,
        "passed": passed,
        "mismatch_type": mismatch_type,
        "reasoning": reasoning,
        "evidence_count": len(evidence.get("sources", [])),
    }


async def run_validation_loop(strategy_version: int | None = None) -> dict:
    """
    Validate all leads for a strategy. If no version given, uses the latest.

    Returns:
        {
            "strategy_version": int,
            "icp": str,
            "total_leads": int,
            "passed": int,
            "failed": int,
            "failure_rate": float,
            "pivot_triggered": bool,
            "results": [...]
        }
    """
    if strategy_version is not None:
        with get_session() as session:
            result = session.run(
                "MATCH (s:Strategy {version: $v}) RETURN s {.*} AS strategy",
                v=strategy_version,
            )
            record = result.single()
            strategy = dict(record["strategy"]) if record else None
    else:
        strategy = _get_current_strategy()

    if not strategy:
        return {"error": "No strategy found"}

    version = strategy["version"]
    icp = strategy["icp"]
    leads = _get_leads_for_strategy(version)

    if not leads:
        return {"error": f"No leads targeted by strategy v{version}"}

    results = []
    for company in leads:
        result = await validate_single_lead(company, icp)
        results.append(result)

    passed = sum(1 for r in results if r["passed"])
    failed = len(results) - passed
    failure_rate = failed / len(results) if results else 0

    pivot_triggered = failure_rate > FAILURE_THRESHOLD
    if pivot_triggered:
        failed_names = [r["company"] for r in results if not r["passed"]]
        _store_pivot_lesson(
            f"Validation failure rate {failure_rate:.0%} exceeds {FAILURE_THRESHOLD:.0%} threshold. "
            f"Failed leads: {', '.join(failed_names)}. Strategy needs refinement."
        )

    return {
        "strategy_version": version,
        "icp": icp,
        "total_leads": len(results),
        "passed": passed,
        "failed": failed,
        "failure_rate": round(failure_rate, 2),
        "pivot_triggered": pivot_triggered,
        "results": results,
    }
