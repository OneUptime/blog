# Validation Summary: Why PostgreSQL ATTACH PARTITION Scans and Locks Despite a CHECK Constraint

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL declarative table partitioning
- `ALTER TABLE ... ATTACH PARTITION`
- `CHECK`, `NOT NULL`, and `NOT VALID` constraints
- PostgreSQL relation locks and `lock_timeout`
- Partitioned indexes and generated columns
- PostgreSQL catalog and monitoring views

## Sources Consulted
- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: Check Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
- [PostgreSQL: Generated Columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
- [PostgreSQL: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: `lock_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT)
- [PostgreSQL: `pg_constraint`](https://www.postgresql.org/docs/current/catalog-pg-constraint.html)
- [PostgreSQL: `pg_locks`](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [PostgreSQL: Monitoring Database Activity](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL 12 Release Notes](https://www.postgresql.org/docs/release/12.0/)
- [PostgreSQL 18 `tablecmds.c`](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/tablecmds.c)

## Issues Found
- The candidate-scan and default-partition-scan claims were stated universally. PostgreSQL does not verify rows in a foreign-table candidate or scan a foreign default partition, and a partitioned relation is validated recursively. The claims were qualified by relation type.
- The `NOT VALID` workflow did not state that `ADD CONSTRAINT` still takes `ACCESS EXCLUSIVE`, or that it must commit before validation to realize the lower-lock benefit. Transaction-boundary guidance and comments were added; validation in a later transaction takes `SHARE UPDATE EXCLUSIVE`.
- The staging-table `LIKE` example omitted `INCLUDING GENERATED`, so it would create ordinary columns where a parent used generated columns and could then fail attachment. `INCLUDING GENERATED` was added, and the schema checklist now covers generated-column status and kind.
- The recursive-partition wording overstated the leaf count as the whole lock footprint, and the hierarchy query was described as counting even though it inventories rows. The prose now refers to the hierarchy's size and shape and accurately labels the query as an inspection of check constraints.
- The schema checklist did not cover the name, definition, and validation compatibility required when an inherited parent `CHECK` constraint is matched on the candidate. That requirement was made explicit, and the nested-candidate checklist item was aligned with PostgreSQL's proof-at-each-level recursion.

## Review Notes
- The review targets current PostgreSQL 18. The weaker `SHARE UPDATE EXCLUSIVE` parent lock for `ATTACH PARTITION` was introduced in PostgreSQL 12; PostgreSQL 11 and earlier used stronger parent locking.
- The executable SQL examples were smoke-tested on PostgreSQL 18.4. The exact typed bound constraint avoided reading candidate rows during attachment, and the generated-column staging definition attached successfully.
- A validated default exclusion may allow NULL because NULL-key rows belong in a default partition; its disjunction correctly excludes only the new August range.
