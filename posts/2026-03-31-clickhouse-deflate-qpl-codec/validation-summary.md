# Validation Summary: How to Use DEFLATE_QPL Codec in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (compression codecs, MergeTree, system tables)
- Intel Query Processing Library (QPL)
- Intel In-Memory Analytics Accelerator (IAA) on Sapphire Rapids Xeon
- DEFLATE compression
- ZSTD, Gorilla, Delta codecs (referenced for comparison/composition)

## Sources Consulted
- ClickHouse `CREATE TABLE` / codecs reference: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse build/benchmark guide for DEFLATE_QPL: https://clickhouse.com/docs/development/building_and_benchmarking_deflate_qpl
- PR #39494 — Add Intel-IAA/QPL-based DEFLATE_QPL Codec: https://github.com/ClickHouse/ClickHouse/pull/39494
- PR #92150 — Remove QPL and QAT: https://github.com/ClickHouse/ClickHouse/pull/92150
- Issue #71442 — DEFLATE_QPL support status: https://github.com/ClickHouse/ClickHouse/issues/71442
- ClickHouse `CompressionInfo.h` (master): https://github.com/ClickHouse/ClickHouse/blob/master/src/Compression/CompressionInfo.h
- ClickHouse v23.6 changelog (introduced `enable_deflate_qpl_codec` setting)
- Intel tuning guide for ClickHouse with IAA: https://www.intel.com/content/www/us/en/developer/articles/guide/clickhouse-iaa-iavx512-4th-gen-xeon-scalable.html

## Issues Found

1. **Wrong build option name in `system.build_options` query.** The post used `USE_QPL`, but the actual CMake/build flag is `ENABLE_QPL` (the option used at build time is `-DENABLE_QPL=ON`). Updated the query to `WHERE name = 'ENABLE_QPL'`.

2. **Incorrect minimum ClickHouse version.** The post claimed "ClickHouse 23.1 or newer". DEFLATE_QPL was actually added in v22.9 (PR #39494, merged July 2022). The non-experimental `enable_deflate_qpl_codec` setting was introduced in 23.6. Updated the requirement to reflect both facts and added a note that the codec was removed from ClickHouse in 2025/early 2026 due to a license incompatibility in the upstream `idxd-config` library (PR #92150). The DeflateQpl entry is gone from `CompressionInfo.h` on master.

3. **Misleading "DEFLATE compatibility for external tool interoperability" claim.** ClickHouse stores compressed columns in its own framed block format, so DEFLATE_QPL output is not directly readable by external `gzip`/`zlib` tools. Replaced that bullet with a more accurate framing (DEFLATE-class compression while offloading from CPU cores).

4. **Wrong configuration snippet under "Configure QPL Thread Count".** The original XML invented a `<compression_codec_settings><deflate_qpl><level>1</level>` block that does not exist in ClickHouse. The actual gate is the user-profile setting `enable_deflate_qpl_codec` (or `SET enable_deflate_qpl_codec = 1`). Renamed the section to "Enable the Codec" and replaced the snippet with the correct `users.xml` profile form and the equivalent `SET` statement.

5. **Vague log grep pattern.** Updated the log-check section to mention the actual ClickHouse log lines (`Hardware-assisted DeflateQpl codec is ready!` / `Initialization of hardware-assisted DeflateQpl codec failed`) and to grep for `DeflateQpl` (the casing used by ClickHouse) instead of just `QPL`.

## Review Notes

- The codec has been removed from current ClickHouse master (the comment in `src/Compression/CompressionInfo.h` reads `DeflateQpl = 0x99, /// Removed, don't reuse for another codec`). The README now warns about this; the rest of the SQL/codec composition examples remain syntactically valid for older versions where the codec is still present. A future revision may want to recommend ZSTD as the default and treat this post as historical.
- The CODEC pipeline order in the examples (`Delta(4), DEFLATE_QPL`, `Gorilla, DEFLATE_QPL`) is correct: domain-specific codecs (Delta, Gorilla) run first, followed by the general-purpose entropy coder.
- `system.build_options` exposes the CMake flag value as a string ("1"/"0" or "ON"/"OFF" depending on version) — the query as written returns whichever string the build emitted. No change needed beyond the column name fix.
- The `LowCardinality(String)` column in the first example intentionally has no explicit codec; that is fine because LowCardinality has its own internal encoding and applies LZ4 by default.
