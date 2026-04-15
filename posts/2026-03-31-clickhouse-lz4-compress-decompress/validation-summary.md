# Validation Summary: How to Use lz4Compress() and lz4Decompress() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- LZ4 compression algorithm

## Sources Consulted
- ClickHouse official documentation — SQL Reference Functions overview: https://clickhouse.com/docs/sql-reference/functions
- ClickHouse official documentation — String Functions: https://clickhouse.com/docs/sql-reference/functions/string-functions
- ClickHouse official documentation — Other Functions: https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse official documentation — CREATE TABLE (compression codecs): https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse official documentation — Compression in ClickHouse: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse official documentation — Compression Modes: https://clickhouse.com/docs/data-compression/compression-modes
- ClickHouse GitHub repository source code search (src/Functions/): https://github.com/ClickHouse/ClickHouse
- ClickHouse GitHub code search for "lz4Compress" (0 results) and "gzipCompress" (0 results)
- ClickHouse blog — New functions added in 2025: https://clickhouse.com/blog/new-functions-2025
- ClickHouse 2025 and 2026 changelogs: https://clickhouse.com/docs/whats-new/changelog

## Issues Found
**Critical: The entire post is based on non-existent ClickHouse functions.**

The functions `lz4Compress()`, `lz4Decompress()`, `gzipCompress()`, `zstdCompress()`, `brotliCompress()`, and `lz4HCCompress()` do not exist as SQL-callable functions in ClickHouse. Evidence:

1. **GitHub code search**: Searching the ClickHouse repository for `lz4Compress` returns zero results. Same for `gzipCompress`.
2. **No documentation**: No official ClickHouse documentation page documents these functions. They do not appear in the String Functions, Other Functions, or any other function category page.
3. **No source files**: The `src/Functions/` directory in the ClickHouse repository contains no files related to SQL-level compression functions.
4. **Not in changelogs**: The 2025 and 2026 ClickHouse changelogs and the "New functions in 2025" blog post do not mention any such functions being added.
5. **No third-party usage**: No external blog posts, tutorials, or Stack Overflow answers demonstrate usage of these functions.

ClickHouse provides compression exclusively at the **column codec level** via the `CODEC()` clause in `CREATE TABLE` statements (e.g., `CODEC(LZ4)`, `CODEC(LZ4HC(9))`, `CODEC(ZSTD(1))`). There are no SQL functions to compress or decompress individual string values within queries.

Every code example in this post would fail with a "function not found" error if executed against any version of ClickHouse. The post cannot be corrected with minor edits because its entire premise is invalid.

## Review Notes
- The post is well-structured and clearly written, but the core functions it describes are fabricated. This appears to be AI-generated content that hallucinated these function names.
- ClickHouse does use LZ4 as its default internal storage compression codec, and the general descriptions of LZ4 performance characteristics are accurate. However, these compression features are only available as column codecs, not as SQL functions.
- If a post about ClickHouse compression is desired, it should cover column-level `CODEC()` options (LZ4, LZ4HC, ZSTD, etc.) in `CREATE TABLE` / `ALTER TABLE` statements, not fabricated SQL functions.
