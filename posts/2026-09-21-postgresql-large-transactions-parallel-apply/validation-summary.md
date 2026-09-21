# Validation Summary: How to Reduce PostgreSQL Transaction Replication Lag with Parallel Apply

## Status

validated

## Post Type

Tutorial / performance measurement guide.

## Technologies Covered

- PostgreSQL 18 logical replication and PostgreSQL 16 feature history.
- Transaction streaming, logical decoding, WAL, and parallel apply workers.
- SQL workload generation, transaction visibility, and replication monitoring.
- Subscriber worker capacity and server configuration.

## Sources Consulted

- [PostgreSQL 16 release notes](https://www.postgresql.org/docs/16/release-16.html) — introduction of parallel apply.
- [PostgreSQL 16 CREATE SUBSCRIPTION](https://www.postgresql.org/docs/16/sql-createsubscription.html) and [PostgreSQL 18 CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) — streaming defaults, modes, and fallback behavior.
- [Streaming of Large Transactions for Logical Decoding](https://www.postgresql.org/docs/18/logicaldecoding-streaming.html) — incremental decoding and transmission before commit.
- [Logical Replication Configuration Settings](https://www.postgresql.org/docs/18/logical-replication-config.html) and [Replication Runtime Settings](https://www.postgresql.org/docs/18/runtime-config-replication.html) — shared worker pools and per-subscription limits.
- [Resource Consumption](https://www.postgresql.org/docs/18/runtime-config-resource.html) — logical decoding memory and background worker capacity.
- [pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html), [pg_settings](https://www.postgresql.org/docs/18/view-pg-settings.html), and [pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) — catalog columns, configuration contexts, and synchronization states.
- [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) and [ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html) — changing streaming modes and refreshing published tables.
- [Subscription Statistics](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION) — worker_type, pid, leader_pid, and relid.
- [CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html), [Set Returning Functions](https://www.postgresql.org/docs/18/functions-srf.html), [String Functions](https://www.postgresql.org/docs/18/functions-string.html), and [Aggregate Functions](https://www.postgresql.org/docs/18/functions-aggregate.html) — table definition, generate_series, md5, repeat, and count.
- [Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html) — committed-row visibility and fresh snapshots.
- [Logical Replication Architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) and [Conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html) — replica triggers and correctness risks of skipping transactions.
- [Author profile](https://github.com/nawazdhandala) — verified the linked GitHub destination.

## Issues Found

1. **Repeated benchmark runs reused the same batch identifier.** The instructions required new primary-key ranges but left every run with `batch_id = 1`. Once the first run was visible, the polling query could immediately report 100000 before the next run arrived, then report 200000 afterward. This invalidated the per-run visibility measurement. Updated the existing instruction to require a unique batch ID for each run and to change the polling predicate to match. The SQL remains a valid first-run example. This follows the documented behavior of `count(*)` over the rows selected by the query.

## Review Notes

- Confirmed that PostgreSQL 16 introduced `streaming = parallel`, with streaming defaulting to `off` in 16 and `parallel` in 18. An existing subscription's stored setting still needs inspection.
- Confirmed temporary-file fallback, application before publisher commit without exposing uncommitted rows, and the distinction between parallel transaction apply and table synchronization.
- All SQL examples use supported PostgreSQL 18 syntax and documented columns/functions. The worker-budget example is illustrative and requires capacity in both global pools; synchronization and parallel workers share the logical replication worker limit.
- The workload generates 100000 rows with 2048-character payloads. Actual WAL volume and streaming activity depend on storage representation and decoding conditions; the post appropriately requires representative sizing and observation rather than guaranteeing a speedup.
- Polling measures client-observed visibility and includes polling/query overhead. Keep polling cadence and other workload conditions comparable. The unindexed batch predicate can become more expensive as previous runs accumulate.
- The subscription catalog is cluster-wide, so identical subscription names in different databases can produce multiple rows in the inspection query; interpret them in the intended database context.
- All external links in the post resolved to their intended resources. No deprecated SQL constructs were identified for the stated version.
- This was a documentation and static SQL review. No live PostgreSQL publisher/subscriber benchmark was executed, and no performance result is claimed.
