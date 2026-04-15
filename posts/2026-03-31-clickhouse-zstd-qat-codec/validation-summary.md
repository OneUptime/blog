# Validation Summary: How to Use ZSTD_QAT Codec in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database engine, SQL syntax, system tables, compression codecs)
- Intel QuickAssist Technology (QAT) hardware acceleration
- ZSTD compression algorithm
- ZSTD_QAT codec (hardware-accelerated ZSTD via Intel QAT)

## Sources Consulted
- ClickHouse CREATE TABLE documentation (codec syntax, ZSTD levels, ZSTD_QAT obsolete status): https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse PR #92150 — Remove QPL and QAT (December 2025): https://github.com/ClickHouse/ClickHouse/pull/92150
- ClickHouse PR #57509 — Original ZSTD_QAT addition: https://github.com/ClickHouse/ClickHouse/pull/57509
- ClickHouse system.build_options documentation: https://clickhouse.com/docs/en/operations/system-tables/build_options
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse random functions documentation (randomString): https://clickhouse.com/docs/sql-reference/functions/random-functions
- ClickHouse other functions documentation (formatReadableSize, currentDatabase): https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse custom partitioning key documentation (toYYYYMM): https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse compression documentation: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse ReplicatedMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication

## Issues Found

1. **CRITICAL — ZSTD_QAT removed from ClickHouse 26.1**: The `ZSTD_QAT` codec was removed from ClickHouse in version 26.1 (PR #92150, merged December 2025) due to licensing incompatibility of underlying libraries. The blog post was dated 2026-03-31, after the removal. Added a prominent deprecation notice at the top of the post clarifying this applies only to versions prior to 26.1.

2. **Incorrect library dependency — `libisal`**: The post listed `libisal` (Intel ISA-L) as a requirement for ZSTD_QAT. This library was actually associated with `DEFLATE_QPL`, not ZSTD_QAT. Corrected to the actual dependencies: Intel QATlib and Intel QAT ZSTD Plugin.

3. **Missing `enable_zstd_qat_codec` setting**: The post did not mention that the `enable_zstd_qat_codec` setting needed to be explicitly enabled in ClickHouse for the codec to work. Added this to the requirements list.

4. **Deprecated `Delta(4)` syntax**: The post used `CODEC(Delta(4), LZ4)` in multiple places. The `Delta(delta_bytes)` parameter syntax is deprecated and will be removed in a future release. Changed all instances to `CODEC(Delta, LZ4)`.

5. **Incorrect claim about seamless heterogeneous hardware deployment**: The post claimed ZSTD_QAT falls back silently and works seamlessly across mixed hardware. In reality, ZSTD_QAT used a different internal byte identifier than standard ZSTD, meaning data compressed with ZSTD_QAT on one node might not be decompressible on nodes without QAT support. Corrected the fallback behavior description to note this limitation.

## Review Notes
- The `system.metrics` query with `WHERE metric LIKE '%Compress%'` will return general compression operation metrics, but there are no QAT-specific metrics in this table. The query is technically valid but may not provide the QAT-specific insight the post implies.
- The ZSTD compression level range of 1-22 is correct for standard ZSTD, but ZSTD_QAT may have only supported levels 1-12 due to hardware limitations. This could not be confirmed definitively from available documentation.
- All SQL syntax (CREATE TABLE, system table queries, functions like `randomString`, `formatReadableSize`, `currentDatabase`, `toYYYYMM`, `LowCardinality`, `ReplicatedMergeTree` with ON CLUSTER, codec chaining) was verified as correct.
- The `randomString(200)` function produces random bytes that are not necessarily printable ASCII, which is fine for a compression ratio comparison but worth noting.
