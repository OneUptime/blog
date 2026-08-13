# Validation Summary: What Happens When an UPDATE Changes a PostgreSQL Partition Key?

## Status
validated

## Post Type
Technical guide / Reference

## Technologies Covered
- PostgreSQL 14-18
- Declarative table partitioning and tuple routing
- SQL `UPDATE`, `RETURNING`, and `EXPLAIN ANALYZE`
- Row-level and statement-level triggers
- MVCC, transactions, and serialization failures
- Primary-key, unique, check, not-null, and foreign-key constraints
- Foreign-table partitions and `postgres_fdw`
- WAL, vacuum, cumulative statistics, logical decoding, and logical replication

## Sources Consulted
- [PostgreSQL 18: UPDATE](https://www.postgresql.org/docs/current/sql-update.html)
- [PostgreSQL 18: Overview of Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL 18: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL 18: CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL 18: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL 18: Serialization Failure Handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [PostgreSQL 18: Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL 18: CREATE FOREIGN TABLE](https://www.postgresql.org/docs/current/sql-createforeigntable.html)
- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL 18: postgres_fdw](https://www.postgresql.org/docs/current/postgres-fdw.html)
- [PostgreSQL 18: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostgreSQL 18: System Columns](https://www.postgresql.org/docs/current/ddl-system-columns.html)
- [PostgreSQL 18: Routine Vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- [PostgreSQL 18: Logical Decoding](https://www.postgresql.org/docs/current/logicaldecoding.html)
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [PostgreSQL 18: Cumulative Statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL 18: Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [PostgreSQL 15 Release Notes](https://www.postgresql.org/docs/15/release-15.html)
- [PostgreSQL 14: UPDATE](https://www.postgresql.org/docs/14/sql-update.html)

## Issues Found
1. **The row-level trigger list promised an exact `AFTER DELETE` / `AFTER INSERT` order.** The trigger documentation specifies that both trigger classes are applied, but it does not guarantee that relative order; constraint triggers can also be deferred. The list now states which `AFTER` triggers apply without promising an order.
2. **The retry pseudocode omitted transaction cleanup.** A `40001` error leaves an explicit transaction aborted unless the client wrapper already ended it. The loop now rolls back an active failed transaction before retrying the complete transaction.
3. **The uniqueness rule could be read as PostgreSQL automatically adding the partition key.** PostgreSQL instead requires every partition-key column to be included in a primary or unique constraint declared on a partitioned parent. The wording now states that requirement explicitly and scopes local constraint enforcement to local destinations.
4. **Foreign-key action behavior lacked a version boundary.** PostgreSQL 15 changed cross-partition updates to run an update action on the partition root; earlier releases processed foreign-key actions as delete and insert actions. The post now qualifies `ON UPDATE` behavior as PostgreSQL 15 and later and advises testing the deployed major version.
5. **The foreign-key hierarchy paragraph incorrectly characterized direct-leaf updates as a row-movement case.** An `UPDATE` naming a plain leaf cannot route a row to a sibling; it fails that leaf's partition constraint. The documented foreign-key restriction instead concerns movement through a partitioned ancestor when a foreign key directly references a different ancestor. The paragraph now distinguishes these cases and recommends defining the relevant foreign key on the root.
6. **The operational-cost bullets used imprecise MVCC and replication terminology.** PostgreSQL does not immediately remove source index entries on delete, and ordinary updates create new row versions rather than updating tuples in place. The post now describes destination index insertion and later vacuum cleanup, scopes the WAL claim to logged local partitions, distinguishes output-plugin-controlled logical decoding from publication-controlled logical replication, and names cumulative per-table counters rather than ambiguous “maintenance statistics.”
7. **The introduction called an `UPDATE` a transaction boundary.** An `UPDATE` is atomic, but it is not a transaction boundary when it runs inside an explicit multi-statement transaction. The sentence now describes it as one statement-level operation that is atomic within the surrounding transaction. The conclusion also now makes explicit that routing requires the `UPDATE` to target a partitioned ancestor rather than a plain leaf.

## Review Notes
- The schema, partition bounds, primary key, `UPDATE ... RETURNING tableoid::regclass`, missing-destination error, and `EXPLAIN (ANALYZE, BUFFERS, WAL, VERBOSE)` syntax were executed successfully on PostgreSQL 18.4. The failed no-destination update left the original row intact.
- A trigger-log test on PostgreSQL 14.17 reproduced the documented participation and ordering through the `BEFORE` phase. Source `AFTER DELETE` and destination `AFTER INSERT` both ran, while moved-row `AFTER UPDATE` did not.
- SQLSTATE `40001`, default-partition caveats, local-to-foreign directionality, the `postgres_fdw` row-movement restriction, destination-local constraint checks, `tableoid`, and the advice to retry the complete transaction all match the official documentation.
- A foreign table cannot be created or attached as a partition below a parent with a unique index. Therefore, the post's general foreign-partition discussion requires a hierarchy without such an index and does not apply unchanged to the sample `events` root, which has a primary key.
- No deprecated SQL syntax or broken documentation links were found.
