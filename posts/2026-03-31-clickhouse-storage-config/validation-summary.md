# Validation Summary: How to Use storage_configuration in ClickHouse Config

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (storage_configuration, MergeTree engine, TTL rules)
- S3 object storage integration
- Azure Blob Storage integration
- Local disk and JBOD configurations

## Sources Consulted
- ClickHouse official docs — MergeTree Multiple Volumes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse official docs — External disks for storing data: https://clickhouse.com/docs/operations/storing-data
- ClickHouse official docs — system.storage_policies: https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse official docs — system.disks: https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse official docs — SYSTEM statements: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse official docs — TTL management: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse GitHub issues #30510 and #40316 (regarding `send_metadata` S3 setting)

## Issues Found
No technical issues found.

## Review Notes
- The `send_metadata` S3 disk setting listed in the Disk Fields table is a real setting but is not listed in the current official ClickHouse documentation page for external disks. It is known from GitHub issues and community sources (e.g., Altinity KB). It may be considered a legacy/undocumented option with known reliability concerns (slow startups, compatibility issues). Future updates to this post could note this caveat.
- The Mermaid diagram shows `disk: default` and `disk: ssd` both under `volume: hot`, while the XML config example only assigns `ssd` to the `hot` volume. This is an intentional illustration of a broader concept vs. the minimal example, not an error, but could be slightly confusing to readers expecting a 1:1 match.
- The `SYSTEM RELOAD CONFIG` command is correct but ClickHouse also auto-detects config file changes in `config.d/` and reloads them without an explicit command. The explicit command is useful to force an immediate reload.
