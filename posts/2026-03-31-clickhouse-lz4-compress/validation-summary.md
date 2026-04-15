# Validation Summary: How to Use lz4Compress() and lz4HCCompress() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- LZ4 compression
- LZ4 HC (High Compression)
- ZSTD compression
- Gzip compression
- ClickHouse column codecs

## Sources Consulted
- ClickHouse official documentation — SQL function reference: https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse official documentation — encoding functions: https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse official documentation — other functions: https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse official documentation — column compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse official documentation — compression in ClickHouse: https://clickhouse.com/docs/en/about-us/distinctive-features#data-compression
- ClickHouse GitHub source code: https://github.com/ClickHouse/ClickHouse (searched for function registrations)
- ClickHouse docs GitHub repo: https://github.com/ClickHouse/clickhouse-docs (verified function category list)

## Issues Found

### Critical: Core functions do not exist (entire post is invalid)

The following SQL functions referenced throughout the blog post **do not exist** in ClickHouse:

- `lz4Compress(data)` — not a ClickHouse SQL function
- `lz4HCCompress(data [, level])` — not a ClickHouse SQL function
- `lz4Decompress(data)` — not a ClickHouse SQL function
- `zstdCompress(payload, level)` — not a ClickHouse SQL function
- `gzipCompress(payload, level)` — not a ClickHouse SQL function

**Evidence:**
1. The ClickHouse official documentation has no "compression functions" page. The URL `https://clickhouse.com/docs/en/sql-reference/functions/compression-functions` returns 404.
2. A GitHub code search for `lz4Compress` across the entire `ClickHouse/ClickHouse` repository returns zero results — the function is not registered in the source code.
3. Similarly, `gzipCompress` returns zero results in the source code. `zstdCompress` only appears in internal C++ code for ZooKeeper snapshot management, not as a SQL function.
4. No external source (Stack Overflow, blog posts, tutorials) references these function names as usable ClickHouse SQL functions.
5. The complete list of ClickHouse function categories in the official docs contains no "compression functions" category.

ClickHouse provides LZ4, LZ4HC, and ZSTD compression exclusively at the **storage codec level** (e.g., `CODEC(LZ4)`, `CODEC(LZ4HC(9))`, `CODEC(ZSTD(3))`), not as callable SQL scalar functions.

Every code example in the post except the "Using LZ4 as a Column Codec" section would fail with an "Unknown function" error if executed against any version of ClickHouse.

### Secondary: numbers(1, 13) generates levels 1–13, not 1–12

The post claims `lz4HCCompress` accepts levels 1–12, then uses `numbers(1, 13)` which generates 13 values (1 through 13), not 12. This would include an out-of-range level 13. However, this issue is moot since the function doesn't exist.

### No changes made

Because the fundamental premise of the post is incorrect (the SQL functions don't exist), the post cannot be fixed with minor edits. It would require a complete rewrite — either as a post about ClickHouse column compression codecs (which is already covered by a separate post `2026-03-31-clickhouse-lz4-compression-codec`) or removal entirely.

## Review Notes
- The only technically accurate section is "Using LZ4 as a Column Codec" which correctly demonstrates `CODEC(LZ4)`, `CODEC(LZ4HC(9))`, and `CODEC(DoubleDelta, LZ4)` syntax.
- The general claims about LZ4 vs LZ4HC behavior (speed vs ratio tradeoffs) are accurate descriptions of the LZ4 algorithm family, just not applicable as ClickHouse SQL functions.
- A separate validated post (`2026-03-31-clickhouse-lz4-compression-codec`) correctly covers LZ4 codec usage in ClickHouse, making this post redundant even if it were rewritten.
