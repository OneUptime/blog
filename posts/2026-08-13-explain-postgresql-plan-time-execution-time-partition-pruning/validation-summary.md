# Validation Summary: Use EXPLAIN to Prove PostgreSQL Pruned Partitions at Plan Time or Runtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL declarative range partitioning
- PostgreSQL partition pruning
- PostgreSQL `EXPLAIN` and `EXPLAIN ANALYZE`
- Prepared statements and generic/custom plan caching
- LATERAL joins and parameterized nested-loop execution
- JSON query plans

## Sources Consulted
- [PostgreSQL: Table Partitioning and Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: ANALYZE](https://www.postgresql.org/docs/current/sql-analyze.html)
- [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL: PREPARE](https://www.postgresql.org/docs/current/sql-prepare.html)
- [PostgreSQL: EXECUTE](https://www.postgresql.org/docs/current/sql-execute.html)
- [PostgreSQL: DEALLOCATE](https://www.postgresql.org/docs/current/sql-deallocate.html)
- [PostgreSQL: SET](https://www.postgresql.org/docs/current/sql-set.html)
- [PostgreSQL: Query Planning Configuration](https://www.postgresql.org/docs/current/runtime-config-query.html)
- [PostgreSQL: Date/Time Operators](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL: LATERAL Subqueries](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL)
- [PostgreSQL: Operator Optimization Information](https://www.postgresql.org/docs/current/xoper-optimization.html#XOPER-OPTIMIZATION-HASHES)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL: Write-Ahead Logging](https://www.postgresql.org/docs/current/wal-intro.html)
- [PostgreSQL: pg_partition_tree](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL 11 Release Notes](https://www.postgresql.org/docs/release/11.0/)
- [PostgreSQL 12 Release Notes](https://www.postgresql.org/docs/release/12.0/)

## Issues Found
- The pruning-disabled comparison used `SET LOCAL` without starting a transaction. Outside a transaction block, PostgreSQL warns and gives `SET LOCAL` no effect. Added `BEGIN` and `ROLLBACK` around the setting and `EXPLAIN`.
- The post deallocated `event_day` before a later JSON `EXPLAIN` tried to execute it. Moved `DEALLOCATE` and `RESET plan_cache_mode` after the JSON example so the prepared generic plan remains available.
- The per-loop example listed a hash join as a possible plan, but its cross-relation predicates use only inequalities and cannot support a PostgreSQL hash join. Reworded the caveat to cover flattened or otherwise unparameterized plans.
- The rollback warning stated that the example necessarily generates WAL and fires triggers. Made both effects conditional because WAL requires relevant changes and only applicable triggers fire.
- The `TIMING OFF` example used the invalid placeholder `SELECT ...;`. Replaced it with an executable date-range query.
- The `pg_partition_tree` link pointed to the wrong documentation page. Updated it to the current System Administration Functions page.

## Review Notes
- The corrected SQL examples were executed sequentially on a disposable PostgreSQL 14.17 instance. They completed successfully and demonstrated the documented plan-time and initialization-time pruning signals, including `Subplans Removed: 2` in text and JSON plans.
- Execution-time partition pruning was introduced in PostgreSQL 11, and `plan_cache_mode` was introduced in PostgreSQL 12. All currently supported PostgreSQL major versions include the features used here.
- Plan shapes remain sensitive to PostgreSQL version, statistics, data, indexes, and planner costs, as the post correctly notes.
