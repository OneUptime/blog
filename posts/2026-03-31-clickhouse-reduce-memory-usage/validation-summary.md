# Validation Summary: How to Reduce ClickHouse Memory Usage for Large Queries

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (analytical database)
- SQL (ClickHouse dialect)
- ClickHouse system tables (system.query_log, system.processes)
- ClickHouse configuration (users.xml, server config)

## Sources Consulted
- ClickHouse documentation on query complexity settings: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse documentation on system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse documentation on SAMPLE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse documentation on JOIN algorithms: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse blog on hash joins (grace hash join settings): https://clickhouse.com/blog/clickhouse-fully-supports-joins-hash-joins-part2
- ClickHouse GitHub PR #10362 (deprecation of max_memory_usage_for_all_queries)

## Issues Found

1. **Deprecated setting `max_memory_usage_for_all_queries`**: The XML config example in the "Setting Memory Limits" section used `max_memory_usage_for_all_queries`, which is deprecated and no longer functional in modern ClickHouse. Changed to `max_memory_usage_for_user`, which is the current per-profile setting that limits total memory for all queries from a user.

2. **Incorrect EXPLAIN output indicator for in-order aggregation**: The comment in the "Use Streaming Aggregation" section said to look for "GroupingKey" in the EXPLAIN output to confirm in-order aggregation. The correct indicator is `AggregatingInOrderTransform`, visible in `EXPLAIN PIPELINE` output. Fixed the comment and changed `EXPLAIN` to `EXPLAIN PIPELINE` to match.

3. **Missing SAMPLE prerequisite**: The "Use SAMPLE" section did not mention that the `SAMPLE` clause requires the table to have a `SAMPLE BY` expression defined in the table engine at creation time. Without this, the query will fail. Added a note about this requirement.

## Review Notes
- The claim that LowCardinality reduces memory "by 10-50x" is reasonable for columns with low cardinality relative to row count, but the actual savings depend heavily on the data distribution. This is acceptable as a general guideline.
- The `tmp_path` server config is still functional but ClickHouse also supports `tmp_policy` for using storage policies with temporary data, which is the more modern approach for multi-disk setups. Not an error, but worth noting for future updates.
- The SAMPLE section's claim of "10x less memory and 10x faster" is approximately correct but actual performance depends on data distribution and the sampling method. This is acceptable as a rough approximation.
- All SQL syntax, system table column names (`memory_usage`, `query_duration_ms`, `read_rows`, `read_bytes`, `elapsed`), and function calls (`formatReadableSize`, `left`, `toStartOfMinute`) are correct and current.
- The grace hash join settings (`join_algorithm = 'grace_hash'`, `grace_hash_join_initial_buckets`, `max_bytes_in_join`) are all valid and correctly used.
