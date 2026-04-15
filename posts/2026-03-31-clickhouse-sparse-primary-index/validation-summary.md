# Validation Summary: How ClickHouse Sparse Primary Index Works

## Status
validated

## Post Type
Technical deep dive / Internals explainer

## Technologies Covered
- ClickHouse (MergeTree engine, sparse primary index, granules, mark files)
- SQL (DDL and query examples)

## Sources Consulted
- ClickHouse official documentation: MergeTree table engine — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse guide: A Practical Introduction to Sparse Primary Indexes — https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes
- ClickHouse official documentation: system.parts — https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse official documentation: Float types — https://clickhouse.com/docs/sql-reference/data-types/float
- ClickHouse official documentation: MergeTree settings — https://clickhouse.com/docs/operations/settings/merge-tree-settings

## Issues Found
1. **Mark file extension `.mrk3` changed to `.mrk2`** (line 49): The post referenced `.mrk3` mark files, but `.mrk3` is only used for compact-format parts. Standard Wide-format parts with adaptive granularity (the default in modern ClickHouse) use `.mrk2`. Changed to `.mrk2`.

2. **Mark file description was incomplete** (line 49): The post stated mark files store "the byte offset in the compressed `.bin` file," but mark files actually store two offsets: (a) the block offset in the compressed `.bin` file, and (b) the granule offset within the uncompressed block. Updated the description to mention both offsets.

## Review Notes
- All SQL syntax is correct and uses valid ClickHouse types and system table columns.
- The `EXPLAIN indexes = 1` syntax is valid and does display granule pruning information.
- The `system.parts.primary_key_bytes_in_memory` column exists and the query is correct.
- The math approximation (1 billion / 8192 ≈ 122,000) is accurate (exact value: 122,070).
- The explanation of binary search on the sparse index is correct per official docs.
- The post could note that adaptive index granularity is enabled by default (`index_granularity_bytes = 10MB`), meaning granules may contain fewer than 8192 rows for wide rows, but this is a minor enhancement rather than a correctness issue.
