# Validation Summary: How to Use zstdCompress() and zstdDecompress() in ClickHouse

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytical database)
- Zstandard (zstd) compression algorithm
- ClickHouse storage codecs (CODEC(ZSTD))

## Sources Consulted
- ClickHouse official documentation: SQL functions reference (system.functions catalog)
- ClickHouse official documentation: CREATE TABLE / column codecs (https://clickhouse.com/docs/sql-reference/statements/create/table)
- ClickHouse Playground (version 26.4.1.272) — live function verification
- Zstandard (zstd) official documentation and RFC 8478

## Issues Found

### CRITICAL: Core functions do not exist

`zstdCompress()` and `zstdDecompress()` **do not exist** as SQL scalar functions in ClickHouse. Running these functions produces:

```
Code: 46. DB::Exception: Function with name `zstdCompress` does not exist.
Code: 46. DB::Exception: Function with name `zstdDecompress` does not exist.
```

A search of `system.functions` for any compression-related functions (`%compress%`, `%zstd%`) confirms no such functions exist. ClickHouse supports ZSTD only as a storage-level compression codec (`CODEC(ZSTD(level))`), not as SQL functions for per-string compression/decompression.

This means **every SQL example** in the post that uses `zstdCompress()` or `zstdDecompress()` would fail with an `UNKNOWN_FUNCTION` error. This affects:
- Basic Compression and Decompression example
- Decompression Round-Trip example
- Compression Levels example
- INSERT with zstdCompress() example
- Decompress on read example
- Measuring Compression Efficiency example
- Inline Compression for ETL Pipelines example
- Bulk Storage Savings Estimate example

The post cannot be corrected without a complete rewrite, as the non-existent functions are its entire premise.

### Minor: Output table missing level 8

The Compression Levels example uses `FROM numbers(1, 8)` which generates 8 values (1 through 8), but the output table only shows 7 rows (levels 1-7), omitting level 8.

### Minor: Off-by-one in INSERT row count

`FROM numbers(1, 10001)` generates 10,001 rows (numbers 1 through 10,001), but the intent appears to be 10,000 rows. Should be `numbers(1, 10000)`.

### Minor: Misleading default level claim

The post states "Level 3 is a commonly used default that balances speed and ratio." While level 3 is zstd's library default, ClickHouse's default ZSTD codec level is 1, not 3. This is misleading in a ClickHouse-focused post.

## Review Notes

- The `CODEC(ZSTD(3))` and `CODEC(DoubleDelta, ZSTD(1))` syntax shown in the "zstd vs Column Codec" section is correct and valid ClickHouse syntax. This is the only section with correct ClickHouse-specific code.
- All auxiliary ClickHouse functions used (`repeat()`, `numbers()`, `base64Encode()`, `hex()`, `rand64()`, `concat()`, `toUnixTimestamp()`, `rand()`, `toString()`) are real and work correctly. The issue is solely with the non-existent `zstdCompress`/`zstdDecompress` functions.
- The general background on Zstandard (developed by Facebook/Meta, fast decompression, levels 1-22) is accurate.
- If this post were to be rewritten, it should focus on ClickHouse's actual ZSTD support: the `CODEC(ZSTD(level))` column codec, system-level compression settings, and `system.parts` / `system.columns` queries to measure compression ratios at the storage layer.
