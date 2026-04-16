# Validation Summary: How to Use gzipCompress() and gzipDecompress() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial / Reference (for a non-existent feature)

## Technologies Covered
- ClickHouse SQL functions (claimed)
- Gzip compression
- MergeTree table engine
- Comparisons to zstd and brotli (also claimed as SQL functions)

## Sources Consulted
- ClickHouse official playground running v26.4.1.272: https://play.clickhouse.com/ — queried `system.functions` and attempted direct calls to `gzipCompress`, `gzipDecompress`, `brotliCompress`, `zstdCompress`
- ClickHouse string functions reference: https://clickhouse.com/docs/sql-reference/functions/string-functions
- ClickHouse other functions reference: https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse encoding functions reference: https://clickhouse.com/docs/sql-reference/functions/encoding-functions
- ClickHouse encryption functions reference: https://clickhouse.com/docs/sql-reference/functions/encryption-functions
- ClickHouse source tree: https://github.com/ClickHouse/ClickHouse/tree/master/src/Functions
- ClickHouse data compression docs: https://clickhouse.com/docs/data-compression/compression-in-clickhouse

## Issues Found
The entire post describes SQL functions that do not exist in ClickHouse.

Verification performed against the official ClickHouse play server (v26.4.1.272):

- `SELECT gzipCompress('test')` → `Code: 46. DB::Exception: Function with name 'gzipCompress' does not exist. (UNKNOWN_FUNCTION)`
- `SELECT brotliCompress('test'), zstdCompress('test'), lz4Compress('test')` → same `UNKNOWN_FUNCTION` error
- `SELECT name FROM system.functions WHERE lower(name) LIKE '%gzip%' OR lower(name) LIKE '%brotli%' OR lower(name) LIKE '%zstd%' OR lower(name) LIKE '%lz4%' OR lower(name) LIKE '%decompress%'` → returns no rows
- The only `%compress%` match in `system.functions` is the aggregate function `estimateCompressionRatio`

A search of the ClickHouse source tree (`src/Functions/`) for compression-related implementation files also finds none — the only `compress`-related path under `src/` is `src/Compression/` (table/column storage codecs), not SQL scalar functions.

ClickHouse provides compression via:
- Column CODECs in table schema (`CODEC(ZSTD)`, `CODEC(LZ4)`, etc.), which is entirely different from scalar SQL functions on `String` values
- Transparent gzip/zstd/brotli handling for HTTP content encoding and for file/S3/URL ingestion (e.g., `.gz`, `.br`, `.zst` extensions)

None of the post's code would run. The post's core premise — that `gzipCompress(data [, level])` and `gzipDecompress(data)` are scalar SQL functions — is false. Every SQL snippet in the post (basic round-trip, compression levels table, INSERT/SELECT with `gzipCompress`, three-way comparison with `zstdCompress`/`brotliCompress`, HTTP gzip output, bulk storage savings) depends on these non-existent functions and will fail with `UNKNOWN_FUNCTION`.

The sample output tables (ratio_pct values, empty-gzip 20-byte length, etc.) are therefore fabricated — they cannot have come from a real ClickHouse run.

Because the post cannot be salvaged by minor edits — its entire subject does not exist — it is marked `not-technically-relevant`. No edits were made to the README.

## Review Notes
- This appears to be part of a series of posts that all assume these compression SQL functions exist (`2026-03-31-clickhouse-brotli-compress`, `2026-03-31-clickhouse-lz4-compress`, `2026-03-31-clickhouse-lz4-compress-decompress`, `2026-03-31-clickhouse-fpc-codec-float-compress`, etc.). The sibling posts likely share the same fundamental issue and should be re-reviewed.
- If the intent is to produce a correct, publishable post on the same topic, it would need to be rewritten around what ClickHouse actually offers: column CODECs (`CODEC(ZSTD(...))`, `CODEC(LZ4)`, etc.) for at-rest compression, HTTP content encoding (`enable_http_compression`, `http_zlib_compression_level`), and transparent handling of `.gz`/`.br`/`.zst` files in `file()`/`s3()`/`url()` table functions.
