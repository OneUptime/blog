# Validation Summary: How to Implement Data Retention Policies in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, TTL expressions, partition management, tiered storage)
- SQL (DDL, ALTER, system tables)
- ClickHouse server XML configuration (storage_configuration, disks, policies, volumes)
- Bash (cron, clickhouse-client CLI)
- Amazon S3 (as a cold storage tier)

## Sources Consulted
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `ALTER TABLE ... TTL` documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse multi-disk / tiered storage documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse `system.merges` documentation: https://clickhouse.com/docs/en/operations/system-tables/merges

## Issues Found
- **Non-existent `has_expired_ttl` column on `system.parts`.** The "Monitoring Retention Activity" section queried `WHERE active = 1 AND has_expired_ttl = 1` to find parts pending TTL eviction. ClickHouse's `system.parts` does not expose a `has_expired_ttl` column; the actual TTL information is exposed via `delete_ttl_info_min` / `delete_ttl_info_max` (and analogous columns for move/recompression/group_by/rows_where TTL rules). Replaced the query with one that filters on `delete_ttl_info_max != toDateTime(0) AND delete_ttl_info_max < now()`, which correctly identifies parts whose delete TTL has expired (excluding parts that have no delete TTL configured, where the value is the epoch sentinel).

## Review Notes
- The TTL DDL syntax (`TTL <expr> DELETE`, column-level TTL, `TO VOLUME`, `MODIFY TTL`, `REMOVE TTL`) is correct and matches current ClickHouse documentation.
- `OPTIMIZE TABLE ... FINAL` does force TTL evaluation as part of the resulting merges, so the "Force TTL Evaluation" section is accurate. Note for readers: `OPTIMIZE ... FINAL` can be very expensive on large tables; `ALTER TABLE ... MATERIALIZE TTL` is a more targeted alternative when you only want to apply a newly modified TTL to existing parts.
- `ALTER TABLE ... DROP PARTITION 202309` is correct. For monthly `toYYYYMM(...)` partitioning the partition ID is the integer literal — quoting it (`DROP PARTITION '202309'`) also works. The bash script's `partition < '${CUTOFF}'` lexicographic comparison happens to be correct for `YYYYMM` strings of equal length.
- The tiered storage XML uses `endpoint`, `access_key_id`, `secret_access_key` for S3 — these are the correct field names for the disk configuration. In production it is recommended to use IAM roles (`use_environment_credentials`) rather than embedding keys in config; this is a hardening note rather than a correctness issue.
- The column TTL example (`email String TTL created_at + INTERVAL 30 DAY`) is correct: when the TTL fires the column value is reset to the column's default expression, which for `String` with no explicit default is the empty string.
- `system.merges` columns referenced (`table`, `elapsed`, `progress`, `result_part_name`) are all valid.
