# Validation Summary: How to Build a Multi-Tenant Analytics Platform with ClickHouse

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree tables and partitioning
- ClickHouse row policies, users, roles, quotas, and settings profiles
- ClickHouse custom query settings
- ClickHouse system tables
- ClickHouse Connect for Python
- chproxy
- YAML-style proxy configuration
- Mermaid diagrams

## Sources Consulted
- ClickHouse CREATE ROW POLICY documentation: https://clickhouse.com/docs/sql-reference/statements/create/row-policy
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse ALTER USER documentation: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse CREATE QUOTA documentation: https://clickhouse.com/docs/sql-reference/statements/create/quota
- ClickHouse CREATE SETTINGS PROFILE documentation: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse custom settings documentation: https://clickhouse.com/docs/operations/settings/query-level#custom-settings
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse partitioning best practices: https://clickhouse.com/docs/best-practices/choosing-a-partitioning-key
- ClickHouse TTL documentation: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.processes documentation: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse Connect Python documentation: https://clickhouse.com/docs/integrations/python
- ClickHouse Connect driver API: https://clickhouse.com/docs/integrations/language-clients/python/driver-api
- ClickHouse Distributed engine remote server settings: https://clickhouse.com/docs/engines/table-engines/special/distributed
- chproxy configuration documentation: https://www.chproxy.org/configuration/default/

## Issues Found
- The shared-table examples partitioned directly by `tenant_id`, which conflicts with ClickHouse guidance to avoid high-cardinality partition keys. Changed common shared tables to partition by month and keep `tenant_id` first in `ORDER BY`; retained direct tenant partitioning only for a small number of large tenants with a low-cardinality caveat.
- The row-policy example used `currentUser()::UInt32` and an unprefixed `tenant_id` custom setting. Replaced it with a documented custom setting prefix (`SQL_`), a tenant user setting, and a row policy scoped to that tenant user.
- The remote server XML used secure port `9440` without `<secure>1</secure>`. Added the secure flag for each tenant replica.
- The quota example assigned a default role without creating or assigning the role. Added role creation and used `ROLE ... DEFAULT ROLE ...`.
- The settings profile assignment used invalid `ALTER USER ... SETTINGS PROFILE` syntax. Replaced it with `ALTER USER ... ADD PROFILES`.
- The Python routing example used the non-official `clickhouse_driver` API and unsafe string rewriting for tenant filters. Updated it to ClickHouse Connect and parameterized tenant filter templates.
- The proxy example used a non-verified `clickhouse-proxy` image and unsupported routing fields. Replaced it with a chproxy-style configuration using documented `users`, `param_groups`, and `clusters`.
- The per-tenant TTL expression used invalid `INTERVAL CASE ... END DAY` syntax. Replaced it with `toIntervalDay(CASE ...)`.
- The query metrics materialized view used `SummingMergeTree` for `max` and `avg` values and read tenant context from the current session. Replaced it with `AggregatingMergeTree` state functions and tenant IDs from logged query settings.
- The running-query example used `getSetting()` against the reviewer session instead of per-query data. Updated it to read `SQL_tenant_id` from `system.processes.Settings`.
- The storage usage query grouped `system.parts` by `tenant_id`, but `system.parts` does not expose table columns. Replaced it with a tenant row and payload usage query over the events table.
- The onboarding section described a stored procedure and used unsafe/generic execution examples. Reworded it as a SQL template and updated the Python example to use ClickHouse Connect `insert` and `command` methods with constrained generated identifiers.

## Review Notes
- The post is now technically valid as a current ClickHouse multi-tenant guide. Some examples remain architectural patterns rather than complete production code, especially query rewriting and tenant-aware storage accounting.
