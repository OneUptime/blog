# Validation Summary: How ClickHouse Mark Files and Granules Work

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- ClickHouse (MergeTree engine internals)
- Mark files (.mrk, .mrk2, .mrk3)
- Granules and sparse primary index
- Adaptive index granularity

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse sparse primary indexes guide: https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse system.merge_tree_settings documentation: https://clickhouse.com/docs/en/operations/system-tables/merge_tree_settings
- ClickHouse system.columns documentation: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse 22.9 changelog

## Issues Found

1. **"Row offset" should be "byte offset"**: The post described the second field in a mark entry as "the row offset within the uncompressed block." ClickHouse mark entries contain two byte offsets: the compressed block offset and the byte offset within the uncompressed block. Changed "row offset" to "byte offset."

2. **Missing .mrk2 in introductory mention**: The intro listed mark file extensions as `.mrk` or `.mrk3`, omitting `.mrk2` which is the most common format in modern ClickHouse (used when adaptive granularity is enabled, which is the default). Added `.mrk2` to the intro.

3. **Incorrect version for adaptive granularity**: The post stated adaptive granularity was introduced in ClickHouse 19.14. The official documentation references version 19.11 as the version where `index_granularity_bytes` was introduced. Changed "19.14" to "19.11."

4. **Incorrect .mrk3 description and version**: The post described `.mrk3` as "Compressed mark files (ClickHouse 22.8+)." The `.mrk3` format is used for compact parts, and the related feature appeared in version 22.9, not 22.8. Corrected the description and version number.

## Review Notes
- The SQL examples (`system.merge_tree_settings` query, `SHOW CREATE TABLE`, `system.columns` query, `CREATE TABLE` with adaptive settings) are all syntactically correct and use valid column/table names.
- The conceptual explanation of how mark files bridge the primary index to column data is accurate and well-presented.
- The default values cited (8192 rows for `index_granularity`, 10MB for `index_granularity_bytes`) are correct.
- The `.mrk` fixed 16-byte entry size (two 8-byte addresses) is correct per official documentation.
