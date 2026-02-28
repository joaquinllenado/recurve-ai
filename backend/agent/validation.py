"""
Lead validation loop — the agent's self-correction engine.

For each lead targeted by the current strategy:
  1. Tavily fact-checks the claimed tech stack
  2. Fine-tuned SLM classifies the lead (Strike / Monitor / Disregard)
  3. Disregard leads produce Lesson + Evidence nodes in Neo4j
  4. If >60% of leads are Disregard, triggers a strategy pivot
"""

import asyncio
import uuid
from datetime import datetime, timezone

from services.feed_manager import feed_manager
from services.neo4j_service import get_session
from services.tavily_service import fact_check_lead
from services.slm_service import classify_lead

FAILURE_THRESHOLD = 0.6


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


def _update_lead_classification(domain: str, classification: str):
    """Set the classification label on a Company node."""
    with get_session() as session:
        session.run(
            "MATCH (c:Company {domain: $domain}) SET c.classification = $classification",
            domain=domain,
            classification=classification,
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


# ---------------------------------------------------------------------------
# Helpers: build the text fields the fine-tuned classifier expects
# ---------------------------------------------------------------------------

def _build_trigger_events(evidence: dict) -> str:
    """Summarise Tavily fact-check results into a trigger-events string."""
    if evidence.get("mismatch"):
        return f"Tech stack mismatch detected: {evidence['mismatch_details']}"

    sources = evidence.get("sources", [])
    if sources:
        snippets = [s.get("summary", "")[:120] for s in sources[:3] if s.get("summary")]
        if snippets:
            return "Recent web evidence: " + "; ".join(snippets)

    return "No recent trigger events detected from web research."


def _build_company_context(company: dict) -> str:
    """Format Company node data into the context string the model expects."""
    name = company.get("name", "Unknown")
    employees = company.get("employees", "unknown")
    funding = company.get("funding", "unknown")
    tech = company.get("tech_stack", [])
    tech_str = ", ".join(tech) if tech else "unknown stack"
    return f"{name} ({funding}, ~{employees} employees) using {tech_str}."


def _derive_mismatch_type(company: dict, evidence: dict) -> str:
    """Pick a specific lesson type from Tavily evidence + company metadata."""
    if evidence.get("mismatch"):
        return "TechStackMismatch"
    employees = company.get("employees", 0)
    if isinstance(employees, int) and employees < 25:
        return "CompanyTooSmall"
    return "Disregard"


# ---------------------------------------------------------------------------
# Core validation
# ---------------------------------------------------------------------------

async def validate_single_lead(
    company: dict,
    product_description: str,
) -> dict:
    """
    Validate one lead: fact-check → classify → store results.

    Returns:
        {
            "company": str,
            "domain": str,
            "classification": "Strike" | "Monitor" | "Disregard",
            "previous_classification": str | None,
            "mismatch_type": str | None,
            "mismatch_details": str | None,
            "evidence_count": int,
        }
    """
    name = company["name"]
    domain = company["domain"]
    tech_stack = company.get("tech_stack", [])
    old_classification = company.get("classification")

    evidence = await fact_check_lead(name, tech_stack)

    trigger_events = _build_trigger_events(evidence)
    company_context = _build_company_context(company)

    result = await classify_lead(product_description, trigger_events, company_context)
    classification = result["classification"]

    await asyncio.to_thread(_update_lead_classification, domain, classification)

    for source in evidence.get("sources", []):
        if source.get("url"):
            await asyncio.to_thread(
                _store_evidence, domain, source["url"], source.get("summary", "")
            )

    mismatch_type = None
    mismatch_details = None
    if classification == "Disregard":
        mismatch_type = _derive_mismatch_type(company, evidence)
        mismatch_details = evidence.get("mismatch_details") or (
            f"{name} classified as Disregard by the SLM."
        )
        await asyncio.to_thread(_store_lesson, domain, mismatch_type, mismatch_details)

    return {
        "company": name,
        "domain": domain,
        "classification": classification,
        "previous_classification": old_classification,
        "mismatch_type": mismatch_type,
        "mismatch_details": mismatch_details,
        "evidence_count": len(evidence.get("sources", [])),
    }


async def run_validation_loop(strategy_version: int | None = None) -> dict:
    """
    Validate all leads for a strategy. If no version given, uses the latest.

    Returns:
        {
            "strategy_version": int,
            "product_description": str,
            "total_leads": int,
            "strike": int,
            "monitor": int,
            "disregard": int,
            "disregard_rate": float,
            "pivot_triggered": bool,
            "results": [...]
        }
    """
    if strategy_version is not None:
        def _fetch_by_version(v: int):
            with get_session() as session:
                result = session.run(
                    "MATCH (s:Strategy {version: $v}) RETURN s {.*} AS strategy",
                    v=v,
                )
                record = result.single()
                return dict(record["strategy"]) if record else None

        strategy = await asyncio.to_thread(_fetch_by_version, strategy_version)
    else:
        strategy = await asyncio.to_thread(_get_current_strategy)

    if not strategy:
        return {"error": "No strategy found"}

    version = strategy["version"]
    product_description = strategy.get("product_description", "")
    leads = await asyncio.to_thread(_get_leads_for_strategy, version)

    if not leads:
        return {"error": f"No leads targeted by strategy v{version}"}

    results = []
    total = len(leads)
    for idx, company in enumerate(leads, 1):
        await feed_manager.broadcast(
            "lead_validating",
            {
                "company": company.get("name", "?"),
                "progress": f"{idx}/{total}",
                "status": f"Validating {company.get('name', '?')}...",
            },
        )
        result = await validate_single_lead(company, product_description)
        await feed_manager.broadcast(
            "lead_validated",
            {
                "company": result["company"],
                "classification": result["classification"],
                "progress": f"{idx}/{total}",
                "status": f"{result['company']} → {result['classification']}",
            },
        )
        results.append(result)

    counts = {"Strike": 0, "Monitor": 0, "Disregard": 0}
    for r in results:
        counts[r["classification"]] = counts.get(r["classification"], 0) + 1

    disregard_rate = counts["Disregard"] / len(results) if results else 0

    pivot_triggered = disregard_rate > FAILURE_THRESHOLD
    if pivot_triggered:
        disregarded = [r["company"] for r in results if r["classification"] == "Disregard"]
        await asyncio.to_thread(
            _store_pivot_lesson,
            f"Disregard rate {disregard_rate:.0%} exceeds {FAILURE_THRESHOLD:.0%} threshold. "
            f"Disregarded leads: {', '.join(disregarded)}. Strategy needs refinement.",
        )

    return {
        "strategy_version": version,
        "product_description": product_description,
        "total_leads": len(results),
        "strike": counts["Strike"],
        "monitor": counts["Monitor"],
        "disregard": counts["Disregard"],
        "disregard_rate": round(disregard_rate, 2),
        "pivot_triggered": pivot_triggered,
        "results": results,
    }
