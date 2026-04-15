# Validation Summary: How to Check ClickHouse Version Compatibility Before Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL database engine)
- ClickHouse system tables (`system.settings`, `system.server_settings`, `system.functions`, `system.query_log`, `system.tables`, `system.replicas`)
- ClickHouse CLI tools (`clickhouse-server`, `clickhouse-client`)
- Docker (`clickhouse/clickhouse-server` image)

## Sources Consulted
- ClickHouse official documentation for system tables: https://clickhouse.com/docs/en/operations/system-tables
- ClickHouse `system.settings` documentation: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse `system.server_settings` documentation: https://clickhouse.com/docs/en/operations/system-tables/server_settings
- ClickHouse `system.functions` documentation: https://clickhouse.com/docs/en/operations/system-tables/functions
- ClickHouse `system.replicas` documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse `system.tables` documentation: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse server configuration documentation: https://clickhouse.com/docs/en/operations/configuration-files
- ClickHouse formats documentation: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse GitHub repository CHANGELOG: https://github.com/ClickHouse/ClickHouse/blob/master/CHANGELOG.md
- Docker Hub `clickhouse/clickhouse-server` image tags

## Issues Found

1. **Non-existent `--check-config` flag**: The post used `clickhouse-server --config=/etc/clickhouse-server/config.xml --check-config` to validate configuration. The `--check-config` flag does not exist in ClickHouse. Replaced with `xmllint --noout /etc/clickhouse-server/config.xml` for XML syntax validation, and updated the explanatory text to reflect the correct approach. Also updated the Summary section which referenced `--check-config`.

2. **Missing `--multiquery` flag**: The Docker shadow upgrade example passed multiple SQL statements in a single `--query` parameter (`SELECT version(); SELECT count() FROM my_db.my_table;`). In ClickHouse versions prior to 24.8, multiple statements in `--query` require the `--multiquery` (or `-n`) flag. Since this post is about version compatibility (potentially running on older versions), added `--multiquery` to ensure the command works across versions.

## Review Notes
- The `system.settings` and `system.server_settings` tables both have a dedicated `is_obsolete` column (UInt8) which could be a more reliable way to find deprecated settings than text-searching the `description` field with `ILIKE '%deprecated%'`. The current approach works but may miss some settings or produce false positives.
- The Docker shadow upgrade example mounts the host's `/var/lib/clickhouse` data directory directly into the new container. In production, this could be risky as the new version might modify data files in a way that's incompatible with the old version. A read-only mount (`-v /var/lib/clickhouse:/var/lib/clickhouse:ro`) or a copy of the data would be safer.
- The `clickhouse/clickhouse-server:24.3` tag is a valid but non-LTS release. The nearest LTS release is 24.8. This is not incorrect but worth noting for readers choosing upgrade targets.
