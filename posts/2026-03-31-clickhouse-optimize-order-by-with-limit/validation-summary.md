# Validation Summary: How to Optimize ORDER BY with LIMIT in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree engines)
- SQL (ORDER BY, LIMIT, LIMIT BY, window functions)
- ClickHouse aggregate functions (argMax, argMin, topK)
- ClickHouse system tables (system.query_log, ProfileEvents)
- ClickHouse query optimization settings (optimize_read_in_order, max_bytes_before_external_sort)

## Sources Consulted
- ClickHouse official documentation on ORDER BY clause: https://clickhouse.com/docs/en/sql-reference/statements/select/order-by
- ClickHouse official documentation on LIMIT BY: https://clickhouse.com/docs/en/sql-reference/statements/select/limit-by
- ClickHouse official documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse official documentation on topK aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topk
- ClickHouse official documentation on argMax/argMin: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse official documentation on MergeTree settings: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse source code (src/Common/ProfileEvents.cpp) for ExternalSortWritePart verification

## Issues Found

1. **Incorrect comment on table ORDER BY direction (line 22)**: The comment said `-- Table ordered by (event_time DESC, user_id)` but the actual ORDER BY clause was `ORDER BY (event_time, user_id)` (ascending). Fixed the comment to `-- Table ordered by (event_time, user_id)` and updated the query comment to clarify that ClickHouse can read in reverse order.

2. **Misleading LIMIT BY claim (line 39)**: The post claimed "LIMIT BY returns top N rows per group without a full sort." LIMIT BY is a row-filtering mechanism applied after ORDER BY; it does not avoid sorting. Changed to "LIMIT BY returns top N rows per group efficiently" to remove the inaccurate claim.

3. **Non-existent column reference in topK example (line 77)**: The query used `WHERE event_date = today()` but the `events` table definition only has `event_time DateTime`, `user_id UInt64`, and `event_type String` — no `event_date` column. Fixed to `WHERE toDate(event_time) = today()`.

4. **SummingMergeTree with summation column in sorting key (lines 104-109)**: The `view_count` column was specified as both the SummingMergeTree summation column and part of the ORDER BY key. ClickHouse documentation states summation columns must not be in the sorting key — rows with different `view_count` values would never be merged, defeating the purpose. Also, DESC in the CREATE TABLE ORDER BY requires the experimental `allow_experimental_reverse_key` setting which was not mentioned. Fixed by removing `view_count DESC` from the ORDER BY, changing it to `ORDER BY (event_hour, page_url)` so rows with the same hour and page URL are properly summed.

## Review Notes
- `optimize_read_in_order` is enabled by default in ClickHouse. The `SET optimize_read_in_order = 1` in the post is redundant but not incorrect — it's acceptable for a tutorial to be explicit about the setting.
- The `ExternalSortWritePart` ProfileEvent was confirmed as a real event in the ClickHouse source code.
- The `topK` function syntax `topK(10)(event_type)` is correct per official documentation.
- The `argMax`/`argMin` usage and comparison with the window function approach are accurate.
