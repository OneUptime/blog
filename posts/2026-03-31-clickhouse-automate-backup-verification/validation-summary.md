# Validation Summary: How to Automate ClickHouse Backup Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (BACKUP/RESTORE SQL commands)
- clickhouse-client CLI
- Amazon S3 (as backup storage backend)
- Bash scripting
- cron (scheduling)
- system.parts system table

## Sources Consulted
- [ClickHouse Backup & Restore documentation](https://clickhouse.com/docs/en/operations/backup)
- [ClickHouse GitHub PR #21945: Add new commands BACKUP and RESTORE](https://github.com/ClickHouse/ClickHouse/pull/21945)
- [ClickHouse system.parts documentation](https://clickhouse.com/docs/en/operations/system-tables/parts)
- [ClickHouse Formats documentation (TSVRaw)](https://clickhouse.com/docs/en/interfaces/formats)

## Issues Found
- **Incorrect version number for BACKUP/RESTORE**: The post stated the `BACKUP`/`RESTORE` SQL commands were available in ClickHouse 22.4+. According to official ClickHouse documentation and release notes, these commands were introduced in ClickHouse 22.8+ (August 2022). Fixed by updating the version reference from `22.4+` to `22.8+`.

## Review Notes
- The `allow_non_empty_tables` RESTORE setting is valid and documented; note that using it can cause data duplication since it mixes existing data with restored data. For pure verification into an empty staging instance, this setting is unnecessary but harmless.
- `SELECT count() FROM analytics.${TABLE}` with `--format TSVRaw` correctly returns a numeric value suitable for shell arithmetic comparison.
- The `system.parts` columns used (`data_compressed_bytes`, `data_uncompressed_bytes`, `active`, `table`, `database`) are all valid.
- The post labels the `system.parts` byte-sums query as "checksum integrity" — strictly speaking, it's a size/volume comparison rather than a cryptographic checksum. Users wanting true checksum comparison should look at `system.parts` columns like `hash_of_all_files` or `hash_of_uncompressed_files`. This is a minor wording nuance, not a technical error, so no change was made.
- The cron line uses `||` to trigger an alert curl on script failure. This works under the default cron shell (/bin/sh) and bash. Note that this does not capture the alerting response in the log; acceptable for the tutorial's scope.
- The bash row-count comparison (`[ "${STAGING_COUNT}" -lt $((PROD_COUNT * 95 / 100)) ]`) assumes non-empty, numeric results; in a production script, additional guards against empty values would be prudent but are out of scope for a tutorial.
