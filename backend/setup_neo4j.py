"""
Neo4j schema setup + synthetic seed data for The Recursive Hunter.

Usage:
    python setup_neo4j.py              # create constraints + seed data (skip if data exists)
    python setup_neo4j.py --reset      # wipe everything, recreate constraints, reseed
    python setup_neo4j.py --seed-only  # just insert seed data (no constraint creation)
"""

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))
from services.neo4j_service import get_session, close_driver


# ---------------------------------------------------------------------------
# Schema: constraints & indexes
# ---------------------------------------------------------------------------

CONSTRAINTS = [
    "CREATE CONSTRAINT strategy_version IF NOT EXISTS FOR (s:Strategy) REQUIRE s.version IS UNIQUE",
    "CREATE CONSTRAINT company_domain IF NOT EXISTS FOR (c:Company) REQUIRE c.domain IS UNIQUE",
    "CREATE CONSTRAINT lesson_id IF NOT EXISTS FOR (l:Lesson) REQUIRE l.lesson_id IS UNIQUE",
    "CREATE INDEX evidence_url IF NOT EXISTS FOR (e:Evidence) ON (e.source_url)",
]


def create_schema():
    with get_session() as session:
        for stmt in CONSTRAINTS:
            session.run(stmt)
    print("[+] Schema constraints and indexes created.")


# ---------------------------------------------------------------------------
# Synthetic seed data
# ---------------------------------------------------------------------------

SEED_CYPHER = """
// ── Strategy v1 (initial) ─────────────────────────────────────────────
CREATE (s1:Strategy {
  version: 1,
  icp: 'B2B SaaS companies with 20-200 engineers running self-managed Postgres on AWS',
  keywords: ['postgres', 'database migration', 'managed hosting', 'aws rds alternative'],
  competitors: ['PlanetScale', 'Neon', 'Supabase', 'AWS RDS'],
  created_at: datetime('2026-02-27T09:00:00Z')
})

// ── Strategy v2 (evolved after lessons) ───────────────────────────────
CREATE (s2:Strategy {
  version: 2,
  icp: 'Series A-C SaaS companies (50-500 employees) actively migrating off AWS to multi-cloud, using Postgres or compatible DBs',
  keywords: ['postgres', 'multi-cloud', 'database migration', 'cloud-agnostic', 'cost optimization'],
  competitors: ['PlanetScale', 'Neon', 'Supabase', 'CockroachDB', 'Timescale'],
  created_at: datetime('2026-02-27T10:30:00Z')
})

CREATE (s2)-[:EVOLVED_FROM]->(s1)

// ── Companies (good fits) ─────────────────────────────────────────────
CREATE (c1:Company {name: 'StreamLayer',     domain: 'streamlayer.io',    tech_stack: ['Python', 'Postgres', 'AWS', 'Kubernetes'],   employees: 85,  funding: 'Series A',  score: 82})
CREATE (c2:Company {name: 'Paylobby',        domain: 'paylobby.com',      tech_stack: ['Go', 'Postgres', 'GCP', 'Terraform'],        employees: 130, funding: 'Series B',  score: 91})
CREATE (c3:Company {name: 'DevHarbor',       domain: 'devharbor.dev',     tech_stack: ['TypeScript', 'Postgres', 'AWS', 'Docker'],   employees: 45,  funding: 'Series A',  score: 78})
CREATE (c4:Company {name: 'Metriful',        domain: 'metriful.io',       tech_stack: ['Rust', 'Postgres', 'Fly.io'],                employees: 30,  funding: 'Seed',      score: 70})
CREATE (c5:Company {name: 'ClimaSync',       domain: 'climasync.com',     tech_stack: ['Python', 'Postgres', 'Azure', 'Kubernetes'], employees: 210, funding: 'Series B',  score: 88})
CREATE (c6:Company {name: 'NomadOps',        domain: 'nomadops.co',       tech_stack: ['Go', 'CockroachDB', 'AWS', 'Nomad'],         employees: 65,  funding: 'Series A',  score: 60})

// ── Companies (mismatches — drive lessons) ────────────────────────────
CREATE (c7:Company {name: 'TinyByte',        domain: 'tinybyte.dev',      tech_stack: ['PHP', 'MySQL', 'DigitalOcean'],               employees: 8,   funding: 'Pre-seed',  score: 15})
CREATE (c8:Company {name: 'VaultedGrid',     domain: 'vaultedgrid.com',   tech_stack: ['Java', 'Oracle DB', 'On-prem'],               employees: 1200, funding: 'Series D', score: 20})
CREATE (c9:Company {name: 'BrightShelf',     domain: 'brightshelf.io',    tech_stack: ['Ruby', 'Postgres', 'Heroku'],                 employees: 22,  funding: 'Seed',      score: 35})
CREATE (c10:Company {name: 'Orbitra',        domain: 'orbitra.ai',        tech_stack: ['Python', 'MongoDB', 'AWS'],                   employees: 55,  funding: 'Series A',  score: 25})

// ── Strategy targeting ────────────────────────────────────────────────
CREATE (s1)-[:TARGETS]->(c1)
CREATE (s1)-[:TARGETS]->(c3)
CREATE (s1)-[:TARGETS]->(c7)
CREATE (s1)-[:TARGETS]->(c8)
CREATE (s1)-[:TARGETS]->(c9)
CREATE (s1)-[:TARGETS]->(c10)

CREATE (s2)-[:TARGETS]->(c1)
CREATE (s2)-[:TARGETS]->(c2)
CREATE (s2)-[:TARGETS]->(c4)
CREATE (s2)-[:TARGETS]->(c5)
CREATE (s2)-[:TARGETS]->(c6)

// ── Evidence ──────────────────────────────────────────────────────────
CREATE (ev1:Evidence {source_url: 'https://streamlayer.io/blog/scaling-postgres', summary: 'StreamLayer documented pain points with self-managed Postgres at scale, exploring managed alternatives.', retrieved_at: datetime('2026-02-27T09:15:00Z')})
CREATE (ev2:Evidence {source_url: 'https://news.ycombinator.com/item?id=39201', summary: 'Paylobby CTO commented on HN about migrating from AWS RDS to multi-cloud Postgres for cost savings.', retrieved_at: datetime('2026-02-27T09:18:00Z')})
CREATE (ev3:Evidence {source_url: 'https://devharbor.dev/engineering/2026-stack', summary: 'DevHarbor 2026 tech stack post confirms AWS + Postgres, mentions evaluating managed DB options.', retrieved_at: datetime('2026-02-27T09:20:00Z')})
CREATE (ev4:Evidence {source_url: 'https://tinybyte.dev/about', summary: 'TinyByte is a 3-person team using PHP/MySQL on DigitalOcean. No Postgres usage found.', retrieved_at: datetime('2026-02-27T09:22:00Z')})
CREATE (ev5:Evidence {source_url: 'https://vaultedgrid.com/careers', summary: 'VaultedGrid runs Oracle DB on-prem with a 5-year enterprise contract. Not a migration candidate.', retrieved_at: datetime('2026-02-27T09:25:00Z')})
CREATE (ev6:Evidence {source_url: 'https://brightshelf.io/blog/cutting-costs', summary: 'BrightShelf blog about reducing Heroku costs. Only 2 dynos, very small infra footprint.', retrieved_at: datetime('2026-02-27T09:28:00Z')})
CREATE (ev7:Evidence {source_url: 'https://orbitra.ai/docs/architecture', summary: 'Orbitra uses MongoDB Atlas as primary datastore. No Postgres in their stack.', retrieved_at: datetime('2026-02-27T09:30:00Z')})
CREATE (ev8:Evidence {source_url: 'https://climasync.com/engineering', summary: 'ClimaSync engineering blog describes multi-cloud Postgres deployment across Azure and AWS.', retrieved_at: datetime('2026-02-27T10:40:00Z')})

CREATE (c1)-[:HAS_EVIDENCE]->(ev1)
CREATE (c2)-[:HAS_EVIDENCE]->(ev2)
CREATE (c3)-[:HAS_EVIDENCE]->(ev3)
CREATE (c7)-[:HAS_EVIDENCE]->(ev4)
CREATE (c8)-[:HAS_EVIDENCE]->(ev5)
CREATE (c9)-[:HAS_EVIDENCE]->(ev6)
CREATE (c10)-[:HAS_EVIDENCE]->(ev7)
CREATE (c5)-[:HAS_EVIDENCE]->(ev8)

// ── Lessons (self-corrections) ────────────────────────────────────────
CREATE (les1:Lesson {lesson_id: 'les-001', type: 'CompanyTooSmall',    details: 'TinyByte has only 8 employees and uses PHP/MySQL. Below ICP threshold and wrong tech stack.',       timestamp: datetime('2026-02-27T09:35:00Z')})
CREATE (les2:Lesson {lesson_id: 'les-002', type: 'ContractLockIn',     details: 'VaultedGrid is locked into a 5-year Oracle enterprise contract. Not a realistic migration target.', timestamp: datetime('2026-02-27T09:36:00Z')})
CREATE (les3:Lesson {lesson_id: 'les-003', type: 'CompanyTooSmall',    details: 'BrightShelf runs only 2 Heroku dynos. Infrastructure too small to justify managed Postgres migration.', timestamp: datetime('2026-02-27T09:37:00Z')})
CREATE (les4:Lesson {lesson_id: 'les-004', type: 'TechStackMismatch',  details: 'Orbitra uses MongoDB, not Postgres. Initial keyword match was misleading — they mentioned Postgres only in a comparison blog post.', timestamp: datetime('2026-02-27T09:38:00Z')})
CREATE (les5:Lesson {lesson_id: 'les-005', type: 'SegmentPivot',       details: 'Over 60% of v1 leads failed validation. ICP was too broad — pivoting to mid-market companies actively migrating to multi-cloud.', timestamp: datetime('2026-02-27T10:00:00Z')})

CREATE (c7)-[:LEARNED_FROM]->(les1)
CREATE (c8)-[:LEARNED_FROM]->(les2)
CREATE (c9)-[:LEARNED_FROM]->(les3)
CREATE (c10)-[:LEARNED_FROM]->(les4)
CREATE (s2)-[:LEARNED_FROM]->(les5)
"""


def seed_data():
    with get_session() as session:
        result = session.run("MATCH (n) RETURN count(n) AS cnt")
        count = result.single()["cnt"]
        if count > 0:
            print(f"[!] Database already has {count} nodes. Use --reset to wipe and reseed.")
            return False
        session.run(SEED_CYPHER)
    print("[+] Synthetic seed data inserted (2 strategies, 10 companies, 8 evidence, 5 lessons).")
    return True


def reset():
    with get_session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    print("[!] All nodes and relationships deleted.")


def verify():
    with get_session() as session:
        result = session.run(
            "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt ORDER BY cnt DESC"
        )
        print("\n[=] Current graph contents:")
        for record in result:
            print(f"    {record['label']}: {record['cnt']}")

        result = session.run(
            "MATCH ()-[r]->() RETURN type(r) AS rel, count(r) AS cnt ORDER BY cnt DESC"
        )
        print("\n[=] Relationships:")
        for record in result:
            print(f"    {record['rel']}: {record['cnt']}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Neo4j setup for The Recursive Hunter")
    parser.add_argument("--reset", action="store_true", help="Wipe all data before setup")
    parser.add_argument("--seed-only", action="store_true", help="Only insert seed data (skip constraints)")
    args = parser.parse_args()

    try:
        if args.reset:
            reset()

        if not args.seed_only:
            create_schema()

        seed_data()
        verify()
    finally:
        close_driver()


if __name__ == "__main__":
    main()
