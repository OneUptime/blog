# Validation Summary: How to Configure Hot/Warm/Cold Storage Policies in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, storage policies, TTL rules)
- ClickHouse XML storage configuration
- S3 storage backend for ClickHouse
- SQL (DDL, ALTER, OPTIMIZE, SYSTEM commands)

## Sources Consulted
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse storage policies and multi-disk configuration: https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse system tables (system.parts): https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse S3 disk configuration: https://clickhouse.com/docs/en/integrations/s3

## Issues Found
No technical issues found.

Verified items:
- XML `<storage_configuration>` structure with `<disks>` and `<policies>` — correct.
- All three volumes (`hot`, `warm`, `cold`) are properly defined, each referencing its respective disk.
- `<type>local</type>` and `<type>s3</type>` disk types are valid.
- S3 disk fields `<endpoint>`, `<access_key_id>`, `<secret_access_key>` are correct names.
- `max_data_part_size_bytes` values are accurate (5368709120 = 5 GiB, 53687091200 = 50 GiB).
- TTL syntax `event_time + INTERVAL N DAY TO VOLUME 'name'` — correct, including chaining multiple rules with commas.
- `SETTINGS storage_policy = '...'` table-level setting — correct.
- `ALTER TABLE ... MODIFY TTL` — correct syntax for adding/modifying TTL on existing tables.
- `move_factor = 0.1` interpretation (data moves when volume is ~90% full / <10% free) — correct.
- All referenced `system.parts` columns (`disk_name`, `bytes_on_disk`, `min_time`, `max_time`, `modification_time`, `partition`, `database`, `table`, `active`) exist.
- `SYSTEM START TTL MERGES` — valid syntax.
- `OPTIMIZE TABLE ... FINAL` — valid syntax.

## Review Notes
- The `move_factor` description is numerically correct but could be reframed more precisely as a *free-space threshold* ("move when free space drops below 10% of the volume") rather than a fullness threshold. Both framings yield the same behavior.
- For production S3 configurations, `use_environment_credentials` or IAM roles are generally preferred over inline `<access_key_id>` / `<secret_access_key>`, but inline credentials remain a valid and documented configuration.
- `SYSTEM START TTL MERGES` only restarts TTL merges if they were previously stopped with `SYSTEM STOP TTL MERGES`. To force immediate TTL re-evaluation on existing parts, `ALTER TABLE ... MATERIALIZE TTL` is the more direct command; `OPTIMIZE TABLE ... FINAL` also works by forcing merges. The commands shown are not wrong, just not the most targeted tools for "forcing" TTL evaluation.
- `min_time` / `max_time` in `system.parts` are populated from the partition key expression. Since the example uses `toYYYYMM(event_time)`, these values will reflect the underlying `event_time` range per part, so the monitoring query works as intended.
