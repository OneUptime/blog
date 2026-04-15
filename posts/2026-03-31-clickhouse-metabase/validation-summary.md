# Validation Summary: How to Use ClickHouse with Metabase

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (SQL, SummingMergeTree engine, projections, query cache, user management)
- Metabase (open-source BI tool, Docker deployment, GUI question builder, SQL editor)
- metabase-clickhouse-driver (official ClickHouse driver for Metabase, version 1.3.3)
- Docker and Docker Compose
- ClickHouse XML user profile configuration

## Sources Consulted
- GitHub releases for ClickHouse Metabase driver: https://github.com/ClickHouse/metabase-clickhouse-driver/releases — confirmed version 1.3.3 exists and JAR filename is `clickhouse.metabase-driver.jar`
- GitHub tags for the driver repo: https://github.com/ClickHouse/metabase-clickhouse-driver/tags — confirmed 1.3.3 tag exists
- Driver plugin manifest (metabase-plugin.yaml via GitHub API) — verified connection properties, field names, and default port (8123)
- Metabase Docker entrypoint script (`bin/docker/run_metabase.sh` via GitHub API) — confirmed `JAVA_OPTS` is explicitly used by the startup script
- Metabase Docker documentation: https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker — confirmed `/plugins` mount path and `MB_DB_FILE` usage
- ClickHouse query cache documentation: https://clickhouse.com/docs/en/operations/query-cache — confirmed `use_query_cache` and `query_cache_ttl` are valid settings

## Issues Found
No technical issues found. All code examples, SQL syntax, CLI commands, Docker configurations, and ClickHouse settings are correct and functional.

## Review Notes
- **Driver version is old but valid**: Version 1.3.3 exists but the latest release from this repository was 1.53.4. More importantly, as of Metabase 54 (released mid-2025), the ClickHouse driver was promoted to a core/bundled driver. Users running Metabase 54+ do not need to manually install the driver JAR. The manual installation instructions still work but are only necessary for older Metabase versions.
- **`plaintext_password` authentication**: The post uses `IDENTIFIED WITH plaintext_password BY` which is valid ClickHouse syntax but stores credentials insecurely. For production, `IDENTIFIED BY 'password'` (which defaults to sha256_password) or `IDENTIFIED WITH sha256_password BY` would be preferable. Acceptable for a tutorial example.
- **`docker-compose.yml` version key**: The `version: "3.8"` key is deprecated in Docker Compose V2 and ignored, but including it does not cause errors.
- **SummingMergeTree with duration_s**: Summing `duration_s` (Float32) during merges is technically valid but semantically questionable for a traffic analytics table where average duration would be more meaningful. However, this is a data modeling choice, not a syntax error.
- **Connection UI field labels**: Minor discrepancies between the post's field labels (e.g., "Database" vs the driver's "Databases" display name, "Additional JDBC arguments" vs "Additional JDBC connection string options") reflect the evolving driver UI across versions and are not functional errors.
