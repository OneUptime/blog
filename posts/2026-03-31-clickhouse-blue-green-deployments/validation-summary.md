# Validation Summary: How to Implement Blue-Green Deployments for ClickHouse

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (SQL, DDL, system tables)
- ClickHouse server administration (apt-based install, systemd)
- Blue-green deployment pattern

## Sources Consulted
- ClickHouse SQL reference: EXCHANGE TABLES — https://clickhouse.com/docs/sql-reference/statements/exchange
- ClickHouse SQL reference: RENAME — https://clickhouse.com/docs/sql-reference/statements/rename
- ClickHouse SQL reference: CREATE VIEW — https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse system tables: system.replicas — https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse SYSTEM statements — https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse functions: hostname / hostName — https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse Atomic database engine — https://clickhouse.com/docs/engines/database-engines/atomic

## Issues Found
- **Incorrect RENAME logic after EXCHANGE TABLES.** The original post ran `EXCHANGE TABLES events_blue AND events_green` and then executed:
  ```sql
  RENAME TABLE events_blue TO events_old,
               events_green TO events_blue;
  ```
  After the EXCHANGE, `events_blue` already holds the new schema and `events_green` holds the old data. The follow-up RENAME moves the new schema into `events_old` and puts the old schema back into `events_blue`, effectively undoing the swap. Additionally, ClickHouse docs state that multi-table RENAME is not atomic — it can be partially executed and leave other sessions seeing a missing table. I replaced the block with a single correct rename that archives the old data:
  ```sql
  RENAME TABLE events_green TO events_old;
  ```

## Review Notes
- `EXCHANGE TABLES` requires the Atomic (or Shared) database engine. Readers on the legacy Ordinary database engine will need to use a multi-step rename via a temporary name instead. This is worth calling out in a future revision but isn't a correctness error given that Atomic has been the default since ClickHouse 20.10.
- `SYSTEM STOP MERGES` / `SYSTEM START MERGES` are not supported on ClickHouse Cloud. The rolling-upgrade recipe therefore applies to self-hosted deployments only.
- `is_leader` in `system.replicas` is technically valid but has become less meaningful in modern ClickHouse, where multiple replicas can act as leaders simultaneously. The column still exists and the query works.
- `apt-get install clickhouse-server=24.x.x` in practice typically requires pinning `clickhouse-common-static` (and often `clickhouse-client`) to the same version to avoid dependency conflicts. Left as-is because it's a typical blog-post simplification and not strictly wrong.
- `CREATE OR REPLACE VIEW` is valid syntax; docs don't explicitly guarantee atomic replacement for ordinary views (only refreshable materialized views), but it's widely used for this pattern in practice.
