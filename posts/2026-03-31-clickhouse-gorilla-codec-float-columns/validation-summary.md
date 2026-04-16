# Validation Summary: How to Use Gorilla Codec in ClickHouse for Float Columns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered

- ClickHouse column compression codecs
- Gorilla codec (XOR-based float compression)
- LZ4 / ZSTD general-purpose compressors
- Delta / DoubleDelta codecs
- MergeTree table engine
- `system.parts` table for compression analysis

## Sources Consulted

- ClickHouse official docs — CREATE TABLE / Column Compression Codecs: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse specialized codecs section (Gorilla, Delta, DoubleDelta)
- Facebook's Gorilla paper (VLDB 2015) — "Gorilla: A Fast, Scalable, In-Memory Time Series Database"

## Issues Found

- **Description wording — fixed.** The post's front-matter description claimed Gorilla uses "XOR-based delta encoding." This conflates two distinct techniques: Delta codec stores `x_n - x_{n-1}`, while Gorilla stores `x_n XOR x_{n-1}`. The ClickHouse docs explicitly state Gorilla "calculates XOR between current and previous floating point value." Changed to "XOR-based encoding" to match the official description and the accurate explanation already present in the body of the post.

## Review Notes

- The CREATE TABLE syntax, CODEC chain ordering (Gorilla transforming, LZ4/ZSTD compressing), ALTER TABLE MODIFY COLUMN + OPTIMIZE FINAL pattern, and `system.parts` query are all correct.
- The three-step algorithm description (XOR, count leading/trailing zeros, encode significant middle bits) is an accurate high-level summary of the Gorilla algorithm from the 2015 paper.
- The post uses `CODEC(Delta(4), LZ4)` for DateTime columns. The `Delta(bytes_size)` parameterized form is technically valid but the ClickHouse documentation notes that specifying `delta_bytes` as an argument is deprecated and will be removed in a future release. Plain `CODEC(Delta, LZ4)` is the forward-compatible form. Not changed, since it still works; worth noting for future updates.
- The post refers to Gorilla as a "transform codec." ClickHouse's official taxonomy is "specialized codec" (as opposed to "general-purpose codec"), but "transform codec" is a reasonable informal description of Gorilla's role in a codec chain and doesn't misrepresent behavior.
- The `gorilla_only` / `gorilla_lz4` benchmark uses `ORDER BY val` on a single-column Float64 table. This sorts values, which is a best-case scenario for Gorilla (XOR of adjacent sorted floats is small). Realistic time-series ordering (by id, ts) would give different ratios, but the example is clearly a minimal illustration, not a representative benchmark.
- Claimed compression ratios (4–10× vs ZSTD, 5–15% improvement from trailing LZ4) are plausible for smooth metric data but, as the post itself notes, should be verified against real data.
