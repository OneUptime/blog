# Validation Summary: How to Implement Data Archival Workflows in ClickHouse

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- ClickHouse (MergeTree engine, TTL rules, storage policies)
- ClickHouse S3 table engine
- ClickHouse partition management (DETACH/ATTACH/MOVE PARTITION)
- ClickHouse refreshable materialized views
- Parquet format
- External schedulers (cron, Airflow)

## Sources Consulted
- ClickHouse TTL guide: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse S3 table engine: https://clickhouse.com/docs/engines/table-engines/integrations/s3
- ClickHouse ALTER PARTITION: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse CREATE VIEW (refreshable materialized views): https://clickhouse.com/docs/sql-reference/statements/create/view#refreshable-materialized-view
- ClickHouse MergeTree storage policies / volumes documentation

## Issues Found

1. **Fabricated `CREATE SCHEDULED JOB` statement.** The post described a ClickHouse `CREATE SCHEDULED JOB ... SCHEDULE '0 2 * * *' AS ...` DDL with a cron-string schedule. This DDL does not exist in ClickHouse — there is no generic scheduled-job feature, and ClickHouse's scheduling primitives use interval syntax (`REFRESH EVERY`/`AFTER`), not cron strings. Replaced with a refreshable materialized view using `REFRESH EVERY 1 DAY OFFSET 2 HOUR` and `APPEND` mode targeting the archive table, and reworded the surrounding text to accurately state that ClickHouse has no cron-style job DDL.

2. **S3 engine with wildcard URL used for writes.** The archive table used `ENGINE = S3('...*.parquet', 'Parquet')`. Per the official S3 engine docs, wildcards (`*`, `**`, `?`, `{…}`, `{N..M}`) are **read-only** — an `INSERT INTO` against such a table will fail. Replaced the URL with the `{_partition_id}` substitution and added `PARTITION BY toYYYYMM(timestamp)`, which is the documented pattern for writable, multi-file S3 table engines. Added a short comment noting the constraint.

3. **Cross-table `ATTACH PARTITION` without `FROM` clause.** The example `ALTER TABLE http_logs_archive ATTACH PARTITION '202301'` (after detaching from `http_logs`) does not move a partition between tables — plain `ATTACH PARTITION` only attaches from the target table's own `detached/` directory. Replaced with the correct documented forms: `ATTACH PARTITION ... FROM <source>` (copy) and `MOVE PARTITION ... TO TABLE <dest>` (move), plus a `DROP PARTITION` note for freeing the source.

## Review Notes

- The TTL multi-tier syntax (`TO VOLUME 'warm'`, `TO VOLUME 'cold'`, `DELETE`) is valid; the storage policy itself must be declared in `storage_configuration.xml` with matching volume names, which the post mentions but does not show in full — acceptable for a short guide.
- Refreshable materialized views are still a relatively recent feature; users on older ClickHouse versions may need to rely on the external-scheduler approach, which the post continues to mention as an alternative.
- The `{_partition_id}` substitution in S3 URLs requires a matching `PARTITION BY` on the table, which is now present in the fix.
- The verification queries using `toYYYYMM(timestamp) = 202301` are correct and idiomatic.
