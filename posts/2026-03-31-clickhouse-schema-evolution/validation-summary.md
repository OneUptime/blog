# Validation Summary: How to Handle Schema Evolution in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse ALTER TABLE DDL (ADD COLUMN, DROP COLUMN, MODIFY COLUMN, RENAME COLUMN)
- ClickHouse ON CLUSTER distributed DDL
- ClickHouse MATERIALIZED and ALIAS column expressions
- ClickHouse system.mutations monitoring

## Sources Consulted
- ClickHouse ALTER TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse RENAME COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column#rename-column
- ClickHouse Mutations documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter#mutations
- ClickHouse ON CLUSTER documentation: https://clickhouse.com/docs/en/sql-reference/distributed-ddl
- ClickHouse Nullable type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse operators documentation (ternary operator): https://clickhouse.com/docs/en/sql-reference/operators

## Issues Found

1. **Summary incorrectly grouped column drops with type changes as requiring rewrites.**
   - **What was wrong:** The summary stated "Type changes and column drops that require rewrites should be planned for low-traffic windows." This contradicted the post's own "Dropping a Column" section, which correctly explained that drops are instant metadata-only operations with lazy data cleanup during merges. Column drops do NOT trigger mutations or require part rewrites.
   - **What was changed:** Rewrote the summary sentence to correctly list dropping columns as an instant metadata operation alongside adding columns and changing defaults, and to only recommend low-traffic planning for type changes (which do trigger mutations).

2. **ON CLUSTER described as applying DDL "atomically."**
   - **What was wrong:** The section stated ON CLUSTER applies DDL "atomically" across all nodes. ON CLUSTER distributes DDL to all nodes via ZooKeeper, but execution is not truly atomic — individual nodes execute independently, and partial failures are possible (e.g., one node could fail while others succeed).
   - **What was changed:** Changed "atomically" to "across all nodes in the cluster" to accurately describe the coordinated but non-atomic nature of ON CLUSTER.

## Review Notes
- The ternary operator syntax (`status_code >= 500 ? 1 : 0`) in the MATERIALIZED expression is valid ClickHouse syntax (it is an alias for the `if()` function). While `if(status_code >= 500, 1, 0)` is the more canonical form seen in most ClickHouse documentation, the ternary operator is officially supported and works correctly.
- The advice to prefer default values over Nullable is sound — Nullable columns store an additional bitmask file per part, which increases storage and can reduce query performance.
- The RENAME COLUMN feature requires ClickHouse 20.4+. The post does not mention version requirements, which is acceptable for a general guide but worth noting for users on older versions.
