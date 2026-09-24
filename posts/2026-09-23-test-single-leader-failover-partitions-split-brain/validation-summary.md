# Validation Summary: How to Test Leader Failover, Network Partitions, and Split-Brain Recovery

## Status
validated

## Post Type
Technical guide to testing single-leader failover and recovery.

## Technologies Covered
- PostgreSQL 18: SQL, streaming replication, synchronous commits, failover, and standby recovery.
- Patroni: distributed configuration store (DCS), leader locks, REST health checks, replication policies, and watchdog fencing.
- Distributed systems: partitions, stale leaders, ownership epochs, retries, idempotency, and client operation ledgers.
- Connection proxies, pooled sessions, and application recovery measurements.

## Sources Consulted
- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html) — asynchronous loss exposure and synchronous acknowledgment policies.
- [PostgreSQL 18: Failover](https://www.postgresql.org/docs/18/warm-standby-failover.html) — fencing the former primary and restoring redundancy.
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html) — column definitions, defaults, primary keys, and uniqueness.
- [PostgreSQL 18: UUID Type](https://www.postgresql.org/docs/18/datatype-uuid.html) — native UUID support.
- [PostgreSQL 18: Date/Time Types](https://www.postgresql.org/docs/18/datatype-datetime.html) — timestamptz support.
- [PostgreSQL 18: Date/Time Functions](https://www.postgresql.org/docs/18/functions-datetime.html) — clock_timestamp() behavior and return type.
- [PostgreSQL 18: pg_rewind](https://www.postgresql.org/docs/18/app-pgrewind.html) — reconciling divergent timelines to rejoin as a standby.
- [Patroni: REST API](https://patroni.readthedocs.io/en/latest/rest_api.html) — /primary, /leader, and /patroni semantics.
- [Patroni: Watchdog Support](https://patroni.readthedocs.io/en/latest/watchdog.html) — stale-primary fencing, activation requirements, and timing limitations.
- [Patroni: Replication Modes](https://patroni.readthedocs.io/en/latest/replication_modes.html) — promotion eligibility, durability/availability tradeoffs, and synchronous-mode limitations.
- [Amazon Builders’ Library: Making Retries Safe with Idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) — uncertain outcomes, request identifiers, and mismatched retry parameters.
- [Author GitHub profile](https://github.com/nawazdhandala) — checked the linked profile and redirect from www.github.com.

## Issues Found
1. **Correctness failure described as requiring two unauthorized writers.** Changed this to a stale writer committing unauthorized effects. A single former leader committing after its authority expires violates fencing; the new leader can be authorized. Patroni’s watchdog documentation explicitly requires preventing commits after the leader key expires.
2. **Recovery instructions ambiguously required both reconnection and continued isolation.** Clarified that the former writer stays fenced from client writes while the connectivity needed for demotion and reconciliation is restored. PostgreSQL documents restoring the former primary as a standby, including pg_rewind where applicable; complete network isolation would prevent network-based recovery.

## Review Notes
- The CREATE TABLE example is valid PostgreSQL 18 SQL and uses supported built-in types and functions. The primary key prevents duplicate IDs within the table; it does not deduplicate external effects or coordinate independent divergent primaries.
- SQL was checked against official documentation; no live PostgreSQL instance or fault-injection cluster was exercised. There are no terminal commands or configuration snippets in the post.
- The distinction between acknowledged success, definite rejection, and uncertain outcomes is sound. The independent ledger, payload checks, application invariants, and repeated comparisons are appropriate test assertions.
- Ownership-epoch rejection is a destination-enforced fencing contract, not a feature implemented by the sample table. PostgreSQL/Patroni deployments must validate their actual fencing mechanism.
- The timestamp default records evaluation time, not commit time or a global ordering across nodes. The post appropriately bases loss checks on operation IDs and client acknowledgments.
- Asynchronous loss and synchronous availability depend on effective replication settings and promotion eligibility. The post correctly avoids an unconditional zero-loss guarantee.
- Patroni endpoint descriptions and watchdog caveats match the consulted documentation, labeled 4.1.5. The /latest/ links can change over time; PostgreSQL links explicitly target version 18.
- All external links in the post resolved to the intended resources. Fault scenarios and interruption measurements are testing recommendations, not claims that a particular deployment has passed those tests.
