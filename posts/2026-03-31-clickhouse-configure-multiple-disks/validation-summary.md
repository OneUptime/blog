# Validation Summary: How to Configure Multiple Disks in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (storage configuration, MergeTree engine)
- ClickHouse XML configuration format
- ClickHouse SQL (DDL, ALTER statements, system tables)

## Sources Consulted
- ClickHouse official docs — Storage Policies and Volumes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse official docs — Server configuration `storage_configuration`: https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse official docs — `system.disks`: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse official docs — `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official docs — `ALTER TABLE ... MOVE PARTITION/PART`: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition

## Issues Found
No technical issues found.

All code and configuration examples were verified against current ClickHouse documentation:

- The `<clickhouse>` root tag with `<storage_configuration>` → `<disks>` and `<policies>` structure is correct (the legacy `<yandex>` root is still supported but `<clickhouse>` is preferred).
- Disk definitions using `<type>local</type>` and `<path>` are correct for local disks.
- Volume options `<max_data_part_size_bytes>` and `<move_factor>` are valid storage policy settings.
- `storage_policy` is a valid `SETTINGS` value for MergeTree tables, and `ALTER TABLE ... MODIFY SETTING storage_policy` is the correct way to change it on an existing table (subject to ClickHouse's constraints about the new policy containing the existing disks).
- `system.parts` columns referenced (`table`, `partition`, `disk_name`, `bytes_on_disk`, `active`, `database`) are all valid.
- `system.disks` columns referenced (`name`, `path`, `free_space`, `total_space`) are all valid.
- `ALTER TABLE ... MOVE PARTITION ... TO VOLUME '...'` and `ALTER TABLE ... MOVE PART '...' TO DISK '...'` syntax is correct.
- Shell commands (`mkdir -p`, `chown -R clickhouse:clickhouse`) are standard and correct.

## Review Notes
- The two XML snippets (`<disks>` and `<policies>`) are shown separately but both must live inside the same `<storage_configuration>` block in the actual configuration file. A careful reader will understand this from the explanatory text ("Group disks into volumes, then combine volumes into policies"), but future revisions could make this more explicit by showing the combined structure.
- Multi-disk storage is configured per-node, not per-cluster; the phrasing "within a single cluster" in the intro is loose but not technically incorrect (nodes in a cluster can each have this configuration).
- When changing `storage_policy` on an existing table via `ALTER TABLE ... MODIFY SETTING`, ClickHouse requires the new policy to contain all disks from the previous policy — this constraint is not mentioned but would be useful context for readers.
