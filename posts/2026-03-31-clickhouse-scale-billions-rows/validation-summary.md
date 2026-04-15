# Validation Summary: How to Scale ClickHouse to Billions of Rows

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplicatedMergeTree, Distributed engine)
- ClickHouse sharding and replication
- ClickHouse codecs (LZ4, DoubleDelta, Gorilla, ZSTD)
- ClickHouse skip indexes (minmax, set)
- ClickHouse SAMPLE clause
- ClickHouse async inserts
- ClickHouse system tables (system.parts)

## Sources Consulted
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse MergeTree engine documentation (SAMPLE BY): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse formatReadableSize function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse asynchronous inserts documentation: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse Distributed engine documentation: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse ReplicatedMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes

## Issues Found

### 1. SAMPLE clause used without SAMPLE BY in table definition
- **What was wrong:** The "Sampling for Approximate Queries" section used `FROM events SAMPLE 0.01` but the `events` table was created without a `SAMPLE BY` clause. ClickHouse requires `SAMPLE BY` in the table definition to use the `SAMPLE` clause in queries; without it the query would fail at runtime.
- **What was changed:** Added a note explaining the `SAMPLE BY` requirement, with a separate `events_sampled` table definition showing the correct syntax (`SAMPLE BY sipHash64(user_id)` with the expression appended to the `ORDER BY` key). Updated the SAMPLE query to reference `events_sampled`.
- **Why:** The SAMPLE BY expression must use columns from the ORDER BY key. Rather than modifying the original `events` table (which serves as a clean foundational schema), a separate table definition clarifies the requirement.

### 2. ORDER BY on formatted string in system.parts query
- **What was wrong:** The "Checking Current Table Size" query used `ORDER BY compressed DESC` where `compressed` is an alias for `formatReadableSize(sum(data_compressed_bytes))`, a String. This produces lexicographic ordering (e.g., "9.00 MiB" sorts after "10.00 GiB"), giving incorrect results.
- **What was changed:** Changed to `ORDER BY sum(data_compressed_bytes) DESC` to sort by the raw numeric byte count.
- **Why:** Sorting by the raw numeric value produces correct size ordering while the formatted string remains in the SELECT list for display.

## Review Notes
- The `GRANULARITY 1` on skip indexes is the most granular setting. For billion-row tables, a higher granularity (e.g., 3 or 4) could reduce index overhead while still providing good filtering. This is a trade-off choice rather than an error.
- The `uniqExact(user_id) * 100` approximation in the SAMPLE query is a rough estimate for unique counts — it can undercount because a user present in both the sampled and unsampled portions is only counted once in the sample. The post's use of `uniqCombined` as an alternative is a better approach for approximate unique counting.
- The `index_granularity = 8192` setting is the default value and could be omitted, but including it explicitly is a valid documentation choice.
