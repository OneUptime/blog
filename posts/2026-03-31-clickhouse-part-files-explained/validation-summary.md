# Validation Summary: How ClickHouse Stores Data on Disk - Part Files Explained

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse on-disk storage format (parts, marks, primary index)
- `system.parts` system table

## Sources Consulted
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on parts and partitions: https://clickhouse.com/docs/en/parts
- ClickHouse source code for checksums (CityHash128 usage): https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeDataPartChecksum.h
- ClickHouse documentation on merge settings: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings

## Issues Found

1. **Incorrect checksum algorithm (line 70)**: The post stated that `checksums.txt` contains "SHA256 checksums." ClickHouse actually uses CityHash128, a fast non-cryptographic hash function, not SHA256. Fixed to "CityHash128 checksums."

2. **Contradictory data.bin description (lines 53-55)**: The example file listing showed a compact part layout (single `data.bin` file), but the description under `data.bin` only described the wide format ("Each column has its own `.bin` file"). This was contradictory and confusing. Reworded to explain both compact (single `data.bin`) and wide (per-column `.bin` files) formats clearly.

3. **Incorrect merge setting recommendation (line 99)**: The post suggested increasing `merge_with_ttl_timeout` to address excessive part counts. That setting only controls the minimum delay between TTL-triggered merges and is not relevant to general part accumulation. Replaced with references to `max_bytes_to_merge_at_max_space_in_pool` and `parts_to_delay_insert`, which are the correct settings for managing general part count issues.

## Review Notes
- The description of `.mrk3` as "used since ClickHouse 21.x" is imprecise — adaptive index granularity and the `.mrk3` format were available earlier (around 19.x), though 21.x is when it became more universally the default. This is a minor imprecision but not strictly wrong.
- The statement that `primary.idx` "stays in memory during queries" is a simplification. ClickHouse loads the primary index into memory when the table is accessed, and it remains cached, but it is not permanently pinned in memory in all configurations. This is acceptable for an introductory post.
- The part naming convention described is correct for the common case but does not cover mutation suffixes (e.g., `_3`) that appear after ALTER mutations. This is a reasonable omission for an introductory post.
- The SQL queries are syntactically correct and would work as described.
