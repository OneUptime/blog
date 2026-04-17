# Validation Summary: How to Use brotliCompress() and brotliDecompress() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial / Reference (for a non-existent feature)

## Technologies Covered
- ClickHouse SQL functions (claimed)
- Brotli compression
- MergeTree table engine
- Column CODECs (mentioned briefly at the end — `CODEC(ZSTD(...))`)

## Sources Consulted
- ClickHouse string functions reference: https://clickhouse.com/docs/sql-reference/functions/string-functions
- ClickHouse encoding functions reference: https://clickhouse.com/docs/sql-reference/functions/encoding-functions
- ClickHouse other functions reference: https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse CREATE TABLE / column compression codec docs: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse data compression docs: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse source tree: https://github.com/ClickHouse/ClickHouse/tree/master/src/Functions (676 registered function .cpp files, none match `brotli*`, `gzip*`, `compress*`, `zstd*`, `lz4*`)
- Sibling validation summaries for `2026-03-31-clickhouse-gzip-compress`, `clickhouse-lz4-compress`, and `clickhouse-zstd-compress` — all previously reviewed and marked `not-technically-relevant` for the same reason (confirmed against ClickHouse v26.4.1.272 playground)

## Issues Found
The entire post describes SQL functions that do not exist in ClickHouse.

- `brotliCompress(data [, level])` — does not exist as a ClickHouse scalar SQL function.
- `brotliDecompress(data)` — does not exist.
- `tryBrotliDecompress` — does not exist.
- `isValidBrotli` — does not exist.
- `CODEC(Brotli)` for column compression — not supported. ClickHouse's supported column codecs are `NONE`, `LZ4`, `LZ4HC`, `ZSTD`, `ZSTD_QAT`, `Delta`, `DoubleDelta`, `GCD`, `Gorilla`, `FPC`, `T64`, and `AES-128/256-GCM-SIV`. Brotli is not among them.

ClickHouse does support Brotli only as an HTTP transport encoding and for transparent decompression of `.br` files in `file()`/`s3()`/`url()` table functions — but never as a row-level SQL function over `String` values.

Every SQL snippet in the post (basic compression/decompression, level table, `INSERT`/`SELECT` with `brotliCompress`, `avg(length(brotliCompress(...)))` benchmark, `tryBrotliDecompress` fallback, storage savings summary) depends on these non-existent functions and would fail with `UNKNOWN_FUNCTION` (`Code: 46`). The sample output tables (e.g., `5800 / 57 / 1.0`, level-by-level `ratio_pct`) are therefore fabricated — they cannot have been produced by a real ClickHouse run.

Because the post cannot be salvaged by minor edits — its entire subject does not exist — it is marked `not-technically-relevant`. No edits were made to the README.

## Review Notes
- This post is part of a larger series that assumes non-existent compression SQL functions (`gzipCompress`, `lz4Compress`, `zstdCompress`, `brotliCompress`). Sibling posts `2026-03-31-clickhouse-gzip-compress`, `2026-03-31-clickhouse-lz4-compress`, and `2026-03-31-clickhouse-zstd-compress` have already been marked `not-technically-relevant` for the same reason.
- A correct post on Brotli compression in ClickHouse would cover: transparent Brotli handling for HTTP responses (`enable_http_compression`) and for ingestion of `.br` files via `file()`/`s3()`/`url()`. Column-level compression must use a supported codec (ZSTD, LZ4, etc.), not Brotli.
- The post's final recommendation to "prefer ClickHouse storage codecs (`CODEC(ZSTD(...))`)" for per-column compression is itself correct — but it is the only technically accurate statement in the post.
