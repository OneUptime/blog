# Validation Summary: How to Use Hot and Cold Storage Tiers in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree storage policies, tiered storage, TTL moves)
- XML server configuration (`config.d/*.xml`)
- SQL DDL (CREATE TABLE, ALTER TABLE MOVE PARTITION / MOVE PART)
- ClickHouse system tables (`system.parts`, `system.disks`)

## Sources Consulted
- ClickHouse MergeTree / multi-volume storage docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- `system.parts` reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- `system.disks` reference: https://clickhouse.com/docs/en/operations/system-tables/disks
- Server configuration parameters (`background_move_pool_size`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- TTL / ALTER MOVE syntax: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition

## Issues Found
1. **Incorrect XML comment on `max_data_part_size_bytes`.** The original comment read `<!-- Move parts to cold when hot volume is 90% full -->`, but that setting has nothing to do with volume fill percentage — it is a per-part size cap, and parts whose estimated merged size exceeds it are written to the next volume. Replaced with `<!-- Parts larger than 5 GiB are written to the next volume -->` to match the actual behavior documented by ClickHouse.
2. **Wrong background pool attribution.** The post said parts are moved by "ClickHouse's background merge thread." Moves are handled by a separate moves pool (controlled by `background_move_pool_size`), not the merge pool. Reworded to "background moves thread pool."

## Review Notes
- The `<clickhouse>` root element (as opposed to the legacy `<yandex>`) is current and correct.
- `move_factor = 0.2` is placed as a direct child of the policy, which matches the official docs' example. The inline explanation ("starts moving when only 20% of the hot volume remains free") is correct.
- SQL examples (storage policy assignment, `TTL ... TO VOLUME`, `ALTER TABLE ... MOVE PARTITION / MOVE PART`) all match current ClickHouse syntax.
- Columns referenced in `system.parts` and `system.disks` are all valid.
- Minor future improvement (not an error): the post could mention that `max_data_part_size_bytes` belongs to a specific volume (it is already correctly nested under `<hot>` in the example) and that `keep_free_space_bytes` is an alternative reservation-based mechanism — but neither is necessary for correctness.
