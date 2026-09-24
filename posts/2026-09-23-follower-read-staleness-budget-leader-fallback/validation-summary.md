# Validation Summary: How to Set a Follower-Read Staleness Budget and Fall Back to the Leader

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- PostgreSQL 18 and SQL.
- Physical streaming replication, WAL replay, and hot standby.
- Read Committed and Repeatable Read snapshots.
- Replicated heartbeats, clock uncertainty, and monotonic elapsed-time measurement.
- JSONB aggregation, leader fallback, and failover topology validation.

## Sources Consulted
- [PostgreSQL 18: Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html) — statement snapshots and retained transaction snapshots.
- [PostgreSQL 18: Hot Standby](https://www.postgresql.org/docs/18/hot-standby.html) — read-only queries and visibility of replayed commits in new snapshots.
- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html) — asynchronous streaming replication and timeline following.
- [PostgreSQL 18: Failover](https://www.postgresql.org/docs/18/warm-standby-failover.html) — external failover coordination and preventing competing primaries.
- [PostgreSQL 18: System Administration Functions](https://www.postgresql.org/docs/18/functions-admin.html) — recovery status, receive/replay positions, replay timestamps, and pausing replay.
- [PostgreSQL 18: Replication Statistics](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW) — lag measurements and idle-system behavior.
- [PostgreSQL 18: Date/Time Functions](https://www.postgresql.org/docs/18/functions-datetime.html) — clock_timestamp(), timestamp differences, and finite-value checks.
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html) — logged tables, primary keys, CHECK constraints, and NOT NULL.
- [PostgreSQL 18: INSERT](https://www.postgresql.org/docs/18/sql-insert.html) and [UPDATE](https://www.postgresql.org/docs/18/sql-update.html) — heartbeat initialization and updates.
- [PostgreSQL 18: Table Expressions](https://www.postgresql.org/docs/18/queries-table-expressions.html) and [VALUES](https://www.postgresql.org/docs/18/sql-values.html) — the single-row input and LEFT JOIN USING behavior.
- [PostgreSQL 18: Aggregate Functions](https://www.postgresql.org/docs/18/functions-aggregate.html), [JSON Functions](https://www.postgresql.org/docs/18/functions-json.html), and [Conditional Expressions](https://www.postgresql.org/docs/18/functions-conditional.html) — jsonb_agg(), composite-row conversion with to_jsonb(), and COALESCE.
- [Author profile](https://github.com/nawazdhandala) — verified that the linked www.github.com URL redirects to the intended profile.

## Issues Found
- The post grouped read-your-writes and current authorization decisions together as requirements that could both be satisfied by a session replication barrier. A barrier for the caller's writes does not establish visibility of authorization changes committed by other sessions. Updated the paragraph to distinguish a session barrier or fresh leader snapshot for read-your-writes from a fresh authoritative read for current authorization decisions. This follows from PostgreSQL's documented snapshot visibility and replay semantics.

- The fallback instructions bounded the request deadline but did not explicitly preserve the freshness budget on the leader path. A leader snapshot can age during a slow query even if a longer request deadline is still available. Added a requirement for a fresh leader snapshot and a bound on its age through response sending.

## Review Notes
- Reviewed all three SQL blocks and the application pseudocode against PostgreSQL 18 documentation. No deprecated APIs or SQL syntax errors were identified. There are no terminal commands or configuration snippets in the post.
- The orders query assumes an existing orders table with a customer_id column and suitable read permissions. The heartbeat primary key and CHECK constraint allow at most one row; the VALUES input and LEFT JOIN preserve a result row when that heartbeat is absent. COALESCE returns an empty JSONB array when no orders match. Aggregate ordering is unspecified, which is compatible with the post's claims.
- The heartbeat age calculation is an application-level conservative bound under the stated assumptions, not a built-in PostgreSQL freshness guarantee. Its correctness depends on accepted replication history, the same physical WAL stream, bounded clock errors at the relevant timestamp observations, a fresh shared snapshot, and a final elapsed-time check before sending. All duration terms must use compatible units.
- A visible heartbeat establishes replay progress on the accepted history. Taking its timestamp before commit and adding the entire request duration conservatively overestimates age under those assumptions. Missing heartbeats, unhealthy clocks, topology changes, and late responses must fail the gate as described.
- Recovery status alone does not prove that a server follows the authoritative primary. The post correctly requires independent topology checks and does not claim asynchronous replication provides linearizability.
- A WAL barrier proves progress to a committed position, not an age in seconds. It must be followed by a fresh snapshot. Replay timestamps can remain unchanged on an idle database, and replication lag statistics are not catch-up predictions.
- Leader fallback must also use a fresh snapshot and honor the endpoint's response-time and freshness contract. Reading from the leader does not prevent a long-running query's snapshot from aging before delivery. Authorization that must remain valid through a subsequent action additionally requires appropriate concurrency control.
- The linked PostgreSQL 18 documentation pages and replication-statistics section resolve to the intended resources. PostgreSQL 18 is a supported version on the review date.
- Validation was based on official documentation and static analysis. SQL was not executed against a live primary/replica deployment; the listed clock-skew, paused-replay, deadline, and failover scenarios remain deployment tests.
