# Validation Summary: How to Configure Workload Scheduling in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse Workload Scheduling (CREATE WORKLOAD SQL syntax)
- ClickHouse Resource Management
- ClickHouse Settings Profiles

## Sources Consulted
- ClickHouse official documentation on Workload Scheduling: https://clickhouse.com/docs/en/operations/workload-scheduling
- ClickHouse CREATE WORKLOAD SQL reference documentation
- ClickHouse system.workloads table documentation
- ClickHouse v23.9, v24.11 release notes and changelogs

## Issues Found

### 1. Incorrect version attribution (HIGH)
- **What was wrong:** The post claimed workload scheduling was "introduced in v24.1". IO-level workload scheduling was introduced in v23.9, and the SQL-based workload management syntax (CREATE WORKLOAD, CREATE RESOURCE) was added in v24.11. There is no mention of workload scheduling in the v24.1 release.
- **What was changed:** Updated the introduction to state "IO scheduling introduced in v23.9, with SQL-based workload management added in v24.11".

### 2. Incorrect PARENT keyword in CREATE WORKLOAD syntax (HIGH)
- **What was wrong:** All CREATE WORKLOAD statements used `PARENT` to specify the parent workload (e.g., `CREATE WORKLOAD interactive PARENT all`). The correct keyword is `IN` (e.g., `CREATE WORKLOAD interactive IN all`).
- **What was changed:** Replaced all 7 occurrences of `PARENT` with `IN` in CREATE WORKLOAD statements.

### 3. Invalid workload setting name max_io_bandwidth (HIGH)
- **What was wrong:** The root workload used `max_io_bandwidth` as a setting name, which is not a valid ClickHouse workload setting. The valid bandwidth-related workload setting is `max_speed`.
- **What was changed:** Replaced `max_io_bandwidth` with `max_speed` in both root workload definitions (the initial example and the practical strategy example).

### 4. Incorrect system.workloads query columns (HIGH)
- **What was wrong:** The query on system.workloads selected columns `priority`, `weight`, and `max_concurrent_queries`, which do not exist in that table. The system.workloads table only has three columns: `name`, `parent`, and `create_query`.
- **What was changed:** Updated the query to select `name`, `parent`, `create_query` instead.

## Review Notes
- The `SET workload = 'name'` session-level syntax used in the post is plausible but not explicitly shown in official docs, which only demonstrate the inline `SETTINGS workload = 'name'` clause on individual queries. Both approaches should work in practice since `workload` is a standard ClickHouse setting.
- The use of CREATE SETTINGS PROFILE to assign workloads to users is conceptually correct and supported by the workload scheduling docs, though explicit examples are not provided in official documentation.
- The monitoring query using system.query_log with ProfileEvents and Settings maps is syntactically correct and a reasonable approach for tracking per-workload resource usage.
- Workload scheduling remains an evolving feature in ClickHouse. Readers should consult the latest documentation for their specific ClickHouse version.
