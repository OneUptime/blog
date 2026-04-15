# Validation Summary: How to Use TTL with Recompression in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- TTL with RECOMPRESS
- ZSTD compression codec
- LZ4 compression codec
- ClickHouse system tables (system.parts, system.part_log)

## Sources Consulted
- ClickHouse official documentation: MergeTree TTL expressions (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)
- ClickHouse official documentation: Compression codecs (https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs)
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse official documentation: system.part_log table (https://clickhouse.com/docs/en/operations/system-tables/part_log)
- ClickHouse official documentation: ALTER TABLE MATERIALIZE TTL (https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl)
- ClickHouse official documentation: OPTIMIZE TABLE (https://clickhouse.com/docs/en/sql-reference/statements/optimize)

## Issues Found

1. **ZSTD level 9 described as "maximum compression"**: ZSTD supports levels 1-22 in ClickHouse. Level 9 is high but not maximum. Changed "maximum compression" to "high compression".

2. **RECOMPRESS combined with TO VOLUME in a single TTL rule**: The ClickHouse TTL grammar defines RECOMPRESS and TO VOLUME as mutually exclusive actions (`DELETE|RECOMPRESS codec|TO DISK|TO VOLUME`). They cannot be combined in one rule. Fixed by splitting into separate TTL rules with staggered intervals and added an explanatory note.

3. **Incorrect column name `compression_codec` in system.parts query**: The column does not exist in `system.parts`. The correct column name is `default_compression_codec`. Fixed the query.

4. **Incorrect column name `reason` in system.part_log query**: The column is named `merge_reason`, not `reason`. Fixed the column name in the SELECT, WHERE, and GROUP BY clauses.

5. **Compression ratio interpretation is backwards**: The ratio is computed as `compressed_bytes / uncompressed_bytes`. Better compression produces a smaller numerator with the same denominator, yielding a *lower* ratio. Changed "Higher ratios" to "Lower ratios".

6. **ZSTD level 22 described as "near-maximum"**: Level 22 is the actual maximum ZSTD level in ClickHouse, not "near-maximum". Changed to "maximum compression".

## Review Notes
- The `OPTIMIZE TABLE ... PARTITION ... FINAL` command will trigger merges that may apply TTL recompression, but the primary documented way to force TTL materialization is `ALTER TABLE ... MATERIALIZE TTL`. The post correctly lists both approaches.
- The post uses ZSTD levels 1, 3, 9, and 22 across examples, which is a reasonable progression for tiered compression strategies.
