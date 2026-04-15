# Validation Summary: How to Use LIMIT and OFFSET in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, LIMIT/OFFSET syntax, system tables)
- SQL (standard LIMIT/OFFSET, pagination patterns, aggregation)

## Sources Consulted
- ClickHouse official documentation: SELECT LIMIT clause (https://clickhouse.com/docs/en/sql-reference/statements/select/limit)
- ClickHouse official documentation: SELECT OFFSET clause (https://clickhouse.com/docs/en/sql-reference/statements/select/offset)
- ClickHouse official documentation: system.query_log table (https://clickhouse.com/docs/en/operations/system-tables/query_log)

## Issues Found

1. **Misleading subquery comment (line 57)**: The comment said "Get the 5 most recent events per type using a subquery" but the query actually retrieves the 100 most recent events overall, filters for `event_type = 'buy'`, and returns 10 rows. Changed to "Get buy events from the 100 most recent events" to accurately describe the query behavior.

2. **Contradictory WHERE clause in aggregation example (lines 136-146)**: The comment said "Top 5 event types by total revenue" but the query included `WHERE event_type = 'buy'`, which filters to a single event type. This makes the `GROUP BY event_type` produce at most one row, rendering `LIMIT 5` meaningless. Removed the WHERE clause so the query correctly demonstrates finding the top 5 event types by revenue.

## Review Notes
- The post correctly documents both `LIMIT n OFFSET m` and `LIMIT m, n` (comma) syntax forms and accurately explains the argument order difference between them.
- The performance advice about large offsets and the cursor-based pagination alternative using tuple comparisons is sound and accurate.
- ClickHouse also supports `LIMIT BY` for per-group row limiting (e.g., `LIMIT 3 BY category`), which could be a useful addition in a future update but is outside the scope of this post.
- All system.query_log column names (query_id, user, query_duration_ms, read_rows, query, event_time) and the type enum value 'QueryFinish' were verified as correct.
