# Validation Summary: How to Use LZ4 Compression in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree tables, codec syntax, system tables)
- LZ4 compression codec
- LZ4HC compression codec
- ZSTD compression codec
- Delta codec (codec pipelines)
- ClickHouse HTTP interface
- ClickHouse server configuration (config.xml)

## Sources Consulted
- ClickHouse CREATE TABLE / CODEC docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- `system.columns` table reference: https://clickhouse.com/docs/en/operations/system-tables/columns
- `system.parts` table reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- Server configuration parameters (compression section): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found
- **Incorrect curl command for LZ4 HTTP compression.** The original example mixed `-X POST`, `--get`, and `--data-binary @data.lz4`. The `--get` flag forces curl into GET mode and URL-encodes payload data, which conflicts with sending a compressed binary body via `--data-binary`. Replaced with the canonical ClickHouse HTTP form: the SQL statement goes in the `?query=` URL parameter and the LZ4-compressed body is sent via `--data-binary`. Also removed the stray `Accept-Encoding: lz4` header, which is only relevant for compressed responses (not an INSERT push).

## Review Notes
- All SQL schema examples and codec syntax (`CODEC(LZ4)`, `CODEC(LZ4HC(9))`, `CODEC(Delta, LZ4)`, `CODEC(ZSTD(1))`) match current ClickHouse syntax.
- `system.columns` and `system.parts` queries reference the correct column names (`data_compressed_bytes`, `data_uncompressed_bytes`, `compression_codec`).
- LZ4HC level range stated as "1-12" is correct; the recommended range per official docs is `[4, 9]` with default 9. Not wrong, but a minor future improvement would be to mention the recommended range.
- The `config.xml` compression snippet is valid XML and parseable by ClickHouse. The canonical form from the docs also includes `<min_part_size>`, `<min_part_size_ratio>`, and optionally `<level>` inside `<case>`, which would make the example more realistic. Left as-is to preserve the author's minimal illustrative style.
- Compression ratio estimates (LZ4: 2-4x, LZ4HC: 3-5x, ZSTD: 4-8x) are reasonable approximations that match published ClickHouse benchmarks; actual ratios vary heavily by data.
