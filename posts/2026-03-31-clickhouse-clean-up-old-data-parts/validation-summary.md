# Validation Summary: How to Clean Up Old ClickHouse Data Parts

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (MergeTree engine, system tables, ALTER TABLE / SYSTEM commands)
- Shell / Bash scripting (clickhouse-client, find, df, awk)

## Sources Consulted
- ClickHouse `SYSTEM` statements: https://clickhouse.com/docs/sql-reference/statements/system
- `ALTER TABLE ... DROP DETACHED / UNFREEZE`: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- `system.detached_parts` table: https://clickhouse.com/docs/operations/system-tables/detached_parts
- `system.parts` table: https://clickhouse.com/docs/operations/system-tables/parts
- MergeTree settings (`old_parts_lifetime`): https://clickhouse.com/docs/operations/settings/merge-tree-settings
- User settings (`allow_drop_detached`): https://clickhouse.com/docs/operations/settings/settings
- `formatReadableSize`: https://clickhouse.com/docs/sql-reference/functions/other-functions

## Issues Found

1. **Invalid `SYSTEM DROP REPLICA '' FROM TABLE` command.** The post claimed this could "trigger cleanup of merged-away parts." This is incorrect — `SYSTEM DROP REPLICA` removes metadata for a dead ReplicatedMergeTree replica from ZooKeeper; it does not touch local data or inactive parts, and an empty string is not a valid replica argument. Replaced with an accurate explanation that inactive parts are removed by a background task after `old_parts_lifetime` seconds (default 480s / 8 min), and showed how to lower that setting via `ALTER TABLE ... MODIFY SETTING old_parts_lifetime`.

2. **Missing `allow_drop_detached` requirement.** `ALTER TABLE ... DROP DETACHED PART/PARTITION` requires the user-level setting `allow_drop_detached = 1`, which was not mentioned. Added `SET allow_drop_detached = 1;` to the relevant examples and the automated cleanup script.

3. **Misleading claim about `DROP DETACHED PARTITION ID 'all'`.** The post described this as "Drop all detached parts for a table," but `'all'` is the partition ID only for tables without an explicit `PARTITION BY` clause — it does not match every partition on a partitioned table. Reworded the comment to make this scope explicit.

4. **Cleanup script used the same misleading `PARTITION ID 'all'` assumption.** Rewrote it to iterate over specific detached part names (`name` column of `system.detached_parts`) and use `DROP DETACHED PART '<part>'` so it works for both partitioned and unpartitioned tables. Also set `allow_drop_detached = 1`.

## Review Notes

- `system.detached_parts` does include `bytes_on_disk`, so that query is valid on current ClickHouse versions.
- `ALTER TABLE ... UNFREEZE WITH NAME '<backup>'` is valid; `SYSTEM UNFREEZE WITH NAME '<backup>'` is an alternative that clears the backup across all tables/disks — could be mentioned in a future revision.
- Manual filesystem deletion of frozen or detached parts is valid but best done with ClickHouse stopped, as the post notes. The `find ... -exec rm -rf` for `tmp_*` directories is risky on a live server because an in-progress merge can own a `tmp_*` directory; the `-mtime +1` mitigates but doesn't eliminate this. The post already warns to stop ClickHouse first, which is the right guidance.
- `OPTIMIZE TABLE` produces merges which eventually turn old parts inactive; it does not directly "clean up" inactive parts — the text is accurate after the rewrite.
