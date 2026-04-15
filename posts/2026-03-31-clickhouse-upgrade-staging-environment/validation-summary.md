# Validation Summary: How to Test ClickHouse Upgrades in a Staging Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (version 24.3)
- Docker
- Bash scripting
- SQL (ClickHouse dialect)
- Kafka (mentioned in context of ingestion pipelines)

## Sources Consulted
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/sample
- ClickHouse SELECT syntax reference: https://clickhouse.com/docs/sql-reference/statements/select
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.settings documentation: https://clickhouse.com/docs/operations/system-tables/settings
- ClickHouse configuration files documentation: https://clickhouse.com/docs/operations/configuration-files
- ClickHouse GitHub Issue #7966 (config validation feature request): https://github.com/ClickHouse/ClickHouse/issues/7966

## Issues Found

### 1. SAMPLE clause placed after WHERE (syntax error)
- **What was wrong:** The SQL query had `SAMPLE 0.1` after the `WHERE` clause. In ClickHouse, the `SAMPLE` clause must appear immediately after the table name in the `FROM` clause, before `WHERE`.
- **What was changed:** Moved `SAMPLE 0.1` to appear before the `WHERE` clause.
- **Why:** The original syntax would produce a parse error. ClickHouse requires `SELECT ... FROM table SAMPLE k WHERE ...` ordering per the official SELECT syntax.

### 2. Incorrect column name `duration_ms` in system.query_log query
- **What was wrong:** The performance comparison query used `avg(duration_ms)`, but the `system.query_log` table has no column called `duration_ms`.
- **What was changed:** Replaced `duration_ms` with `query_duration_ms`.
- **Why:** The correct column name is `query_duration_ms` (UInt64) as documented in the system.query_log table reference.

### 3. Non-existent `--check-config` flag for clickhouse-server
- **What was wrong:** The config validation command used `clickhouse-server --check-config`, but `clickhouse-server` does not have a `--check-config` flag.
- **What was changed:** Replaced with `clickhouse-extract-from-config --config-file /etc/clickhouse-server/config.xml --key path`, which is ClickHouse's built-in config preprocessing/validation tool.
- **Why:** The `--check-config` flag does not exist (see GitHub Issue #7966). The `clickhouse-extract-from-config` tool is the recommended approach for validating configuration files.

## Review Notes
- The `SAMPLE` clause in the data loading query requires the source table (`production.events`) to have a `SAMPLE BY` expression defined in its MergeTree engine definition. If the table lacks this, the SAMPLE clause will fail. The post could mention this prerequisite in a future update.
- The Docker setup mounts the host's `/etc/clickhouse-server` directly into the container. In practice, you'd likely want a separate copy of the config to avoid conflicting with a production instance running on the same host.
- The `system.settings` query using the `default` column is correct for ClickHouse 24.x, which includes this column.
- The bash test script uses unquoted `${CH_STAGING}` expansion intentionally for word splitting -- this is correct for the use case but could be fragile if paths contain spaces. Fine for a tutorial context.
