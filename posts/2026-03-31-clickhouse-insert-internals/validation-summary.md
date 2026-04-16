# Validation Summary: How ClickHouse Handles INSERT Operations Internally

## Status
validated

## Post Type
Technical guide / explainer

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Buffer table engine
- ClickHouse async inserts
- ClickHouse system tables (system.part_log)

## Sources Consulted
- ClickHouse system.part_log docs: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse Settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse Buffer engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/buffer
- ClickHouse MergeTree custom partitioning docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse MergeTree docs (data part naming, mark formats)

## Issues Found
1. **Wrong column name in `system.part_log` query.** The post selected `bytes_compressed_on_disk`, which is not a column in `system.part_log`. The correct column is `size_in_bytes` (compressed size on disk for the part). Fixed the SELECT to use `size_in_bytes`.
2. **Block number scope claim.** The post stated "Block numbers are monotonically increasing per table." Per ClickHouse documentation, block numbers are allocated and monotonically increasing **per partition**, not per table. Fixed wording to "per partition."
3. **`insert_deduplicate` scope was understated.** The post implied deduplication works for any MergeTree, but per docs `insert_deduplicate` only applies to `Replicated*` MergeTree tables (it relies on the deduplication log in Keeper). Clarified this in the Deduplication section.

## Review Notes
- `async_insert_busy_timeout_ms` still works as an alias but has been renamed to `async_insert_busy_timeout_max_ms` in newer ClickHouse releases (with a companion `async_insert_busy_timeout_min_ms` for adaptive flush). The post's name is still valid; consider updating to the new name in a future revision for forward-compatibility.
- The `async_insert_max_data_size` default of 10 MiB matches OSS defaults. ClickHouse Cloud uses a larger default (100 MiB), worth noting if the audience runs on Cloud.
- The mention of `.mrk3` mark files is reasonable: small fresh inserts typically materialize as Compact parts (single combined `.mrk3`), and only larger merged parts switch to Wide format (`.mrk2` per column). The post does not need to enumerate both formats but readers should know both exist.
- `primary.idx` is the traditional uncompressed primary index name. Newer ClickHouse versions optionally support a compressed primary index (`primary.cidx`); both are valid depending on settings.
- Part name format `{partition_id}_{min_block}_{max_block}_{level}` is correct as the basic form; mutated parts append a fifth `_{mutation}` segment.
