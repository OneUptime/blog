# Validation Summary: How to Plan ClickHouse Version Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL database, versioning, system tables, BACKUP statement)
- ClickHouse CLI tools (`clickhouse-server`, `clickhouse-client`)

## Sources Consulted
- ClickHouse versioning documentation: https://clickhouse.com/docs/knowledgebase/what-is-clickhouse-versioning
- ClickHouse BACKUP statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/backup
- ClickHouse system.replicas table documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse system.query_log table documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse GitHub repository (CHANGELOG.md, version files)

## Issues Found
1. **Versioning scheme description was incorrect.** The post described the versioning scheme as `YEAR.MONTH.PATCH` (3 components) but ClickHouse versions have 4 components: `YEAR.RELEASE.PATCH.BUILD`. The example version `24.3.5.46` was explained as "patch 5.46" which incorrectly merged the patch number (5) and build number (46) into a single decimal. Fixed to correctly describe the 4-component scheme and explain each component separately.

2. **Non-LTS support period description was imprecise.** The post stated non-LTS releases get "only 3 months" of support. The official documentation frames this as "the 3 most recent stable releases" receiving support, not a fixed time period. Since stable releases come out roughly monthly, this is approximately 3 months in practice, but the framing was corrected to match the official policy.

## Review Notes
- All SQL queries use correct ClickHouse syntax and reference valid system table columns (`system.tables`, `system.query_log`, `system.parts`, `system.replicas`).
- The `BACKUP DATABASE ... TO Disk(...)` syntax is correct and available since ClickHouse 22.8+.
- The `extractAll` query in Step 3 is functional but simplistic — it only captures the first matching function name per query via `[1]`. This is adequate for a demonstration but users should be aware it won't give comprehensive function usage statistics.
- The changelog URL (`https://github.com/ClickHouse/ClickHouse/blob/master/CHANGELOG.md`) is a valid path in the ClickHouse GitHub repository.
