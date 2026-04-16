# Validation Summary: How to Use JBOD Storage Configuration in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree / ReplicatedMergeTree
- JBOD storage policies (disks, volumes, tiered storage)
- ClickHouse system tables (`system.parts`, `system.disks`)
- ClickHouse XML configuration

## Sources Consulted
- [MergeTree — Using multiple block devices](https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#using-multiple-block-devices-for-data-storage)
- [system.parts](https://clickhouse.com/docs/operations/system-tables/parts)
- [system.disks](https://clickhouse.com/docs/operations/system-tables/disks)
- [ALTER TABLE ... MOVE PARTITION|PART](https://clickhouse.com/docs/sql-reference/statements/alter/partition)

## Issues Found
- **Invented setting `volume_fill_factor`**: The "Understanding Part Distribution" section claimed ClickHouse fills disks sequentially via a `volume_fill_factor` setting. No such setting exists in ClickHouse, and the default distribution within a volume is round-robin — not sequential fill. Replaced the example with the correct `load_balancing` setting (valid values: `round_robin`, `least_used`) and clarified the default.
- **Invented setting `prefer_not_to_merge_across_volumes`**: The snippet purporting to "prefer least-used disk" used a nonexistent configuration key, and the key had nothing to do with load balancing anyway. Replaced it with a correct example using `max_data_part_size_bytes` to cap part size per volume (a valid, related volume-level setting).

## Review Notes
- The `disk_name`, `bytes_on_disk`, and `active` columns used in the `system.parts` query are valid.
- The `name`, `path`, `free_space`, and `total_space` columns used in the `system.disks` query are valid.
- `ALTER TABLE ... MOVE PART/PARTITION TO DISK/VOLUME` syntax is current and correct.
- `keep_free_space_bytes` at the disk level is valid.
- `move_factor` as a policy-level setting is valid.
- `max_data_part_size_bytes` as a volume-level setting is valid.
- ClickHouse also supports a volume-level `prefer_not_to_merge` setting, but the official documentation strongly discourages its use (harmful, causes performance degradation) — correctly not recommended in the post after fixes.
