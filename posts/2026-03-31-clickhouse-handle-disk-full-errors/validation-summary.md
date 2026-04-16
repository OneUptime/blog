# Validation Summary: How to Handle Disk Full Errors in ClickHouse

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (MergeTree storage, system tables, ALTER TABLE operations)
- Linux filesystem utilities (`df`, `du`, `find`, `truncate`)
- ClickHouse storage configuration (XML)
- TTL policies and partition management

## Sources Consulted
- [ClickHouse system.detached_parts documentation](https://clickhouse.com/docs/en/operations/system-tables/detached_parts)
- [ClickHouse system.parts documentation](https://clickhouse.com/docs/en/operations/system-tables/parts)
- [ClickHouse system.disks documentation](https://clickhouse.com/docs/en/operations/system-tables/disks)
- [ClickHouse ALTER PARTITION documentation](https://clickhouse.com/docs/en/sql-reference/statements/alter/partition)
- [ClickHouse storage configuration / keep_free_space_bytes](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes_configure)
- [ClickHouse TTL documentation](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)
- [Altinity KB: detached parts](https://kb.altinity.com/altinity-kb-useful-queries/detached-parts/)

## Issues Found

1. **`DROP DETACHED PARTITION` missing required setting.** The statement `ALTER TABLE ... DROP DETACHED PARTITION ID 'all'` fails by default because ClickHouse requires the `allow_drop_detached` setting to be enabled. Updated the example to append `SETTINGS allow_drop_detached = 1` and added a note explaining the requirement.

2. **Column alias used in `WHERE` clause.** The alert query referenced the alias `used_pct` in the `WHERE` clause. By default (without the new analyzer, `enable_analyzer = 1`), ClickHouse does not support using SELECT aliases in `WHERE`. Replaced `WHERE used_pct > 80` with the expanded expression `WHERE (total_space - free_space) / total_space * 100 > 80` so the query works regardless of analyzer settings.

## Review Notes

- `system.detached_parts` does include a `bytes_on_disk` column in current ClickHouse versions, so the SQL query in Step 2 is correct.
- `ALTER TABLE ... DROP DETACHED PARTITION ID 'all'` is only applicable to tables created without a `PARTITION BY` clause (which use the implicit partition ID `all`). For partitioned tables, readers will need to substitute their actual partition ID. This was not flagged as a fix since the example uses a made-up table name.
- Error "Code: 28" corresponds to the POSIX `ENOSPC` errno, matching "No space left on device" — correct.
- The `keep_free_space_bytes` storage-configuration setting is a valid per-disk setting (10737418240 bytes = 10 GiB), correctly documented.
- `OPTIMIZE TABLE ... FINAL` can be resource-intensive and may temporarily require more disk space before freeing it; not a correctness issue, but readers should be aware.
- `rm -rf /var/lib/clickhouse/shadow/...` and `truncate -s 0` on the running server log are destructive; the post correctly warns to verify DR needs before removing frozen snapshots.
