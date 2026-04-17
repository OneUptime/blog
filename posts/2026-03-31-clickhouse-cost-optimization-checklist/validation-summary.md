# Validation Summary: ClickHouse Cost Optimization Checklist

## Status
validated

## Post Type
Reference / Checklist

## Technologies Covered
- ClickHouse (MergeTree engine, codecs, TTL, storage policies)
- Compression codecs: ZSTD, LZ4, Delta, Gorilla
- LowCardinality data type
- ClickHouse system tables: `system.columns`, `system.query_log`, `system.parts`
- S3-compatible object storage (tiered storage)

## Sources Consulted
- ClickHouse docs — Column Compression Codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec)
- ClickHouse docs — MergeTree TTL (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)
- ClickHouse docs — `system.columns` (https://clickhouse.com/docs/en/operations/system-tables/columns)
- ClickHouse docs — `system.query_log` (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse docs — LowCardinality (https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality)
- ClickHouse docs — SAMPLE clause (https://clickhouse.com/docs/en/sql-reference/statements/select/sample)

## Issues Found
- Claim "ZSTD(3)... typically 2-3x better than LZ4" overstated the compression-ratio improvement. Real-world ClickHouse workloads typically see ~20-50% (1.2-2x) better compression with ZSTD over LZ4, not 2-3x. Updated the checklist line to "typically 20-50% better compression ratio than LZ4" to reflect realistic gains.

## Review Notes
- All SQL examples are valid: `system.columns` columns (`data_compressed_bytes`, `data_uncompressed_bytes`), `system.query_log` columns (`normalized_query_hash`, `read_bytes`, `event_time`, `type` = `'QueryFinish'`), and the multi-action `MODIFY TTL ... TO DISK ..., ... DELETE` syntax are all correct.
- Codecs referenced (ZSTD with level argument, Delta as a preparation codec chained with a general-purpose codec, Gorilla for floating-point, LowCardinality for strings) are all valid and recommended per ClickHouse documentation.
- `SAMPLE 0.01` is valid fractional-sampling syntax, but it requires the target table to have a `SAMPLE BY` expression in its MergeTree definition — worth calling out to readers in a future revision.
- The filesystem cache and part-size tuning points in the S3 section are accurate directionally; concrete setting names (e.g., `filesystem_cache_size`, `min_bytes_for_wide_part`) could strengthen that section in the future.
