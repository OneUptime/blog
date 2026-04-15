# Validation Summary: How to Handle Schema Migrations in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, ALTER TABLE operations, system tables)
- SQL (DDL statements, schema migrations)
- Distributed ClickHouse clusters (ON CLUSTER DDL)

## Sources Consulted
- ClickHouse ALTER COLUMN documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse Distributed DDL documentation: https://clickhouse.com/docs/en/sql-reference/distributed-ddl
- ClickHouse system.mutations documentation: https://clickhouse.com/docs/en/operations/system-tables/mutations

## Issues Found
1. **ON CLUSTER DDL described as "atomic"**: The post stated that `ON CLUSTER` "propagates the change to all shards and replicas atomically." This is incorrect. ClickHouse ON CLUSTER DDL is distributed with eventual consistency — queries are eventually executed on each host, but there is no transactional atomicity guarantee across the cluster. Some nodes may be temporarily unavailable and will execute the DDL later. Fixed the sentence to remove the "atomically" claim and clarify the eventual consistency behavior.

## Review Notes
- All SQL syntax (ADD COLUMN, DROP COLUMN, RENAME COLUMN, MODIFY COLUMN, CLEAR COLUMN IN PARTITION) verified correct against official ClickHouse documentation.
- The `system.mutations` monitoring query correctly references the `table` and `is_done` columns.
- The migration tracking table using MergeTree with ORDER BY version is a reasonable pattern.
- The CLEAR COLUMN section is presented after DROP COLUMN, which could confuse readers into thinking they can CLEAR a column after dropping it. The two are alternatives, not sequential steps. This is a clarity issue rather than a technical error.
- The post correctly notes that MODIFY COLUMN type changes create mutations and are not instant, which is an important operational consideration.
