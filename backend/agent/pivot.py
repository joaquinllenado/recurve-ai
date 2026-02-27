"""
Pivot email drafting — triggered when the Scout detects a competitor event.

Given a trigger event (e.g. competitor outage), finds affected leads
from the current strategy, drafts personalized outreach for each,
and logs the pivot to Neo4j.
"""

import uuid
from datetime import datetime, timezone

from services.neo4j_service import get_session
from services.slm_service import draft_pivot_email


def _get_current_strategy() -> dict | None:
    with get_session() as session:
        result = session.run(
            "MATCH (s:Strategy) RETURN s {.*} AS strategy "
            "ORDER BY s.version DESC LIMIT 1"
        )
        record = result.single()
        return dict(record["strategy"]) if record else None


def _get_affected_leads(competitor: str) -> list[dict]:
    """
    Find companies from the current strategy that might be affected by
    a competitor event. Matches companies whose tech stack or known
    associations overlap with the competitor.
    """
    with get_session() as session:
        result = session.run(
            """
            MATCH (s:Strategy)
            WITH s ORDER BY s.version DESC LIMIT 1
            MATCH (s)-[:TARGETS]->(c:Company)
            RETURN c {.*} AS company
            """,
        )
        leads = [dict(r["company"]) for r in result]

    if not leads:
        return []

    competitor_lower = competitor.lower()
    affected = []
    for lead in leads:
        stack = [t.lower() for t in lead.get("tech_stack", [])]
        if competitor_lower in stack or any(competitor_lower in t for t in stack):
            affected.append(lead)

    # If no direct tech-stack match, all leads under the strategy are
    # potential outreach targets (the competitor event is market-wide).
    return affected if affected else leads


def _log_pivot_event(trigger_event: dict, emails_drafted: int):
    """Log the pivot event as a Lesson node linked to the current strategy."""
    lesson_id = f"les-{uuid.uuid4().hex[:8]}"
    competitor = trigger_event.get("competitor", "unknown")
    status = trigger_event.get("status", "unknown")

    with get_session() as session:
        session.run(
            """
            MATCH (s:Strategy)
            WITH s ORDER BY s.version DESC LIMIT 1
            CREATE (l:Lesson {
                lesson_id: $lesson_id,
                type: 'TriggerPivot',
                details: $details,
                timestamp: datetime($now)
            })
            CREATE (s)-[:LEARNED_FROM]->(l)
            """,
            lesson_id=lesson_id,
            details=(
                f"Scout detected {status} for {competitor}. "
                f"Drafted {emails_drafted} outreach email(s)."
            ),
            now=datetime.now(timezone.utc).isoformat(),
        )


async def run_pivot_drafting(trigger_event: dict) -> dict:
    """
    Full pivot flow:
      1. Get current strategy
      2. Find affected leads
      3. Draft personalized email for each
      4. Log the pivot event to Neo4j

    trigger_event: {"status": "critical_outage", "competitor": "DigitalOcean", ...}

    Returns:
        {
            "trigger": {...},
            "strategy_version": int,
            "affected_leads": int,
            "emails": [{"company": str, "domain": str, "subject": str, "body": str}, ...]
        }
    """
    strategy = _get_current_strategy()
    if not strategy:
        return {"error": "No strategy found"}

    competitor = trigger_event.get("competitor", "")
    affected = _get_affected_leads(competitor)

    if not affected:
        return {
            "trigger": trigger_event,
            "strategy_version": strategy["version"],
            "affected_leads": 0,
            "emails": [],
        }

    emails = []
    for company in affected:
        email = await draft_pivot_email(company, trigger_event, strategy)
        emails.append({
            "company": company["name"],
            "domain": company["domain"],
            "subject": email.get("subject", ""),
            "body": email.get("body", ""),
        })

    _log_pivot_event(trigger_event, len(emails))

    return {
        "trigger": trigger_event,
        "strategy_version": strategy["version"],
        "affected_leads": len(affected),
        "emails": emails,
    }
