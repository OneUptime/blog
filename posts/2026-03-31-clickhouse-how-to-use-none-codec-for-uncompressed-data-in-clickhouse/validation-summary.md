# Validation Summary: How to Use NONE Codec for Uncompressed Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse column codecs (NONE, LZ4, ZSTD, Delta)
- MergeTree / ReplicatedMergeTree engines
- ClickHouse system tables (system.columns, system.parts)
- ClickHouse TTL and tiered storage (S3/object storage)

## Sources Consulted
- ClickHouse docs — Column Compression Codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse docs — system.columns: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse docs — system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse docs — ALTER COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse docs — TTL / Storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
No technical issues found.

- The `CODEC(NONE)` syntax and its use on columns is valid.
- Combining codecs such as `CODEC(Delta, LZ4)` is valid and idiomatic for DateTime columns.
- `system.columns` exposes `name` (aliased as `column`), `type`, and `compression_codec`, so the `column` reference in the audit query is valid.
- `system.parts` exposes `data_compressed_bytes` and `data_uncompressed_bytes` as used in the comparison query.
- `ALTER TABLE ... MODIFY COLUMN ... CODEC(...)` is the correct syntax to change a codec; `OPTIMIZE TABLE ... FINAL` triggers merges that re-encode parts with the new codec.
- `ReplicatedMergeTree('/clickhouse/tables/{shard}/...', '{replica}')`, `ON CLUSTER`, and `TTL ts + INTERVAL N DAY TO DISK 's3_disk'` are all valid ClickHouse syntax.

## Review Notes
- An alternative to `OPTIMIZE TABLE FINAL` for forcing recompression of a single column is `ALTER TABLE ... MATERIALIZE COLUMN column_name`, which can be less disruptive than a full-table merge. The post's approach still works and is acceptable.
- The default server codec is configurable via the `compression` setting and is commonly LZ4; the post correctly qualifies this with "usually LZ4".
- For the `random_tokens` example, note that ClickHouse still wraps column data in a small per-block header even with `CODEC(NONE)`, so "on-disk" size is not exactly equal to raw bytes. This is a minor storage-layer detail and not an error in the post.
