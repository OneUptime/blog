# Validation Summary: How to Use EmbeddedRocksDB Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- EmbeddedRocksDB table engine
- RocksDB (LSM-tree storage)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official docs - EmbeddedRocksDB engine: https://clickhouse.com/docs/engines/table-engines/integrations/embedded-rocksdb
- ClickHouse docs - System tables (`system.parts`, `system.tables`, `system.rocksdb`)
- ClickHouse docs - Lightweight DELETE and ALTER TABLE DELETE

## Issues Found

1. **Incorrect claim about composite primary keys.** The post originally stated that `PRIMARY KEY` could be a single column "or a tuple for composite keys" and included a `rate_limits` example using `PRIMARY KEY (tenant_id, endpoint, window_ts)`. The official ClickHouse docs explicitly state: *"primary key must be specified, it supports only one column in the primary key."* Multi-column/tuple primary keys are not supported by EmbeddedRocksDB.
   - **Fix:** Updated the introductory sentence to state that the `PRIMARY KEY` must reference exactly one column. Rewrote the "Composite Primary Key" section as "Composite Keys via Encoded Strings" showing how to concatenate multiple field values into a single `String` key — the idiomatic workaround. Added a bullet to the Limitations section noting that multi-column primary keys are not supported.

2. **`system.parts` does not include EmbeddedRocksDB tables.** The original "Checking Table Size and Row Count" section queried `system.parts`, which is specific to the MergeTree family. EmbeddedRocksDB tables never appear there, so the query would always return zero rows.
   - **Fix:** Replaced the query with one that uses `system.tables` (`total_rows`, `total_bytes`) and added a note mentioning that `system.rocksdb` is available for internal RocksDB metrics.

## Review Notes
- Upsert-on-duplicate-key semantics, single-column primary key requirement, and `optimize_for_bulk_insert` / `bulk_insert_block_size` settings are all verified against current ClickHouse documentation.
- Both `DELETE FROM` (lightweight delete) and `ALTER TABLE DELETE` (mutation) are officially supported on EmbeddedRocksDB tables per docs, so the Deleting Rows section is accurate.
- The output timestamps in the "Upsert Behavior" example (`2024-06-15 10:35:00`) are illustrative of a `now()` value captured after the previous insert; left as-is since they are clearly example output.
- The "Using as a Dictionary Source" section title is slightly loose (the example shows a JOIN rather than a `CREATE DICTIONARY` with a `CLICKHOUSE` source pointing at the EmbeddedRocksDB table), but the underlying technical claim — that EmbeddedRocksDB makes a good backing store for key-value enrichment — is accurate. Left unchanged per the "only fix technical errors" scope.
