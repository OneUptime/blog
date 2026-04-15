# Validation Summary: How to Use T64 Codec in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (column-oriented DBMS)
- T64 compression codec
- LZ4 and ZSTD compression codecs
- Delta and DoubleDelta codecs (comparison)
- MergeTree engine
- system.parts and system.columns system tables

## Sources Consulted
- ClickHouse official documentation: Column compression codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec)
- ClickHouse official documentation: Specialized codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#specialized-codecs)
- ClickHouse source code: `CompressionCodecT64.cpp` — verified `isCompression() = true`, `MagicNumber` enum for supported types, and `getValuableBitsNumber(min, max)` algorithm
- ClickHouse official documentation: ALTER TABLE MODIFY COLUMN syntax
- ClickHouse official documentation: system.parts and system.columns tables

## Issues Found

### 1. Inaccurate description of T64 mechanism (intro paragraph)
**What was wrong:** The post stated T64 works by "discarding common leading bits that are identical across all 64 rows." In reality, T64 crops unused high bits based on the min/max range of values in the block (computed via XOR of min and max), not by checking bit-by-bit identity across rows.
**What was changed:** Reworded to: "cropping unused high bits based on the min/max range of values in the block."
**Why:** The official ClickHouse documentation describes T64 as a codec that "crops unused high bits of values." The source code confirms the algorithm uses `min ^ max` to determine the number of valuable bits.

### 2. Inaccurate mechanism explanation in "How T64 Works" section
**What was wrong:** The post said "T64 identifies these shared bits, removes them, and stores only the lower bits that differ." This is a misleading simplification.
**What was changed:** Reworded to explain that T64 computes min/max, determines bits needed via XOR, stores lower bits after transposition, and records upper bits in a header for decompression.
**Why:** Aligns with the actual algorithm in the source code (`getValuableBitsNumber` function).

### 3. Incomplete supported types list
**What was wrong:** The supported types list was missing `Date32`, `Enum8`, `Enum16`, `Decimal32`, and `Decimal64`.
**What was changed:** Added the missing types to the supported types list.
**Why:** The ClickHouse source code `MagicNumber` enum explicitly includes these types. The official docs also mention Enum support.

### 4. Incorrect claim that T64 must be paired with a compressor
**What was wrong:** The post stated "T64 is a transform and must be paired with a compressor." T64 returns `isCompression() = true` in the source code, meaning it is a compression codec that can be used standalone — unlike Delta, DoubleDelta, and GCD which are data-preparation codecs that truly cannot be used alone.
**What was changed:** Reworded to: "T64 is a specialized compression codec and can be used standalone, but it is recommended to pair it with a general-purpose compressor like LZ4 or ZSTD for best results."
**Why:** The ClickHouse documentation only lists Delta, DoubleDelta, and GCD as codecs that cannot be used stand-alone. T64 is not in that list.

## Review Notes
- The post does not mention the optional `T64('bit')` parameter variant for full bit-level transposition (as opposed to the default byte-mode). This is a minor omission that doesn't affect correctness of the examples shown.
- The comparison table claim "Random integers: T64 may be slightly better" is debatable — for truly random 64-bit integers, neither T64 nor Delta provides significant benefit and the difference is negligible. This is not incorrect, just optimistic.
- All SQL code examples are syntactically correct and use valid ClickHouse syntax.
- The benchmarking methodology is sound and the `system.parts` query is correct.
- The ALTER TABLE and OPTIMIZE TABLE examples use correct syntax.
