# Validation Summary: How to Build a Real-Time Counters System with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree engines)
- ClickHouse Materialized Views (TO syntax)
- SQL (DDL and DQL)
- LowCardinality data type optimization

## Sources Consulted
- ClickHouse documentation on SummingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse knowledge base on materialized view synchronous behavior: https://clickhouse.com/docs/knowledgebase/are_materialized_views_inserted_asynchronously
- ClickHouse blog on materialized views: https://clickhouse.com/blog/using-materialized-views-in-clickhouse
- Altinity Knowledge Base on materialized views: https://kb.altinity.com/altinity-kb-schema-design/materialized-views/
- ClickHouse documentation on MergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on date functions (toYYYYMM, toStartOfHour, toStartOfDay, today): https://clickhouse.com/docs/sql-reference/functions/date-time-functions

## Issues Found
1. **Double-counting bug in "Live Counter Query Pattern" section.** The original query used `UNION ALL` to combine the `event_counts` materialized view (filtered to `event_date >= today()`) with a raw scan of `events` for the last 5 minutes. The explanation stated this was needed to cover "last 5 minutes not yet in MV." This is incorrect — ClickHouse materialized views with `TO` syntax fire synchronously on insert, so data appears in the target table immediately. The overlapping time ranges in the UNION ALL would cause every event from the last 5 minutes to be counted twice (once from `event_counts`, once from the raw `events` table).

   **Fix:** Changed the MV subquery to exclude today (`AND event_date < today()`) and changed the raw subquery to cover the entire current day (`WHERE event_time >= toStartOfDay(now())`). This makes the two halves of the UNION ALL non-overlapping. Updated the explanatory text to correctly describe the purpose of the pattern (finer time granularity for the current day) and to note that ClickHouse MVs are synchronous.

## Review Notes
- All SQL syntax (CREATE TABLE, CREATE MATERIALIZED VIEW, SELECT queries) is correct for current ClickHouse versions.
- The use of `count` as a column name works in ClickHouse but could be confusing since it shadows the `count()` function name. Not changed since it is technically valid.
- The explanation of why `sum(count)` is needed when querying SummingMergeTree (unmerged parts may have duplicate keys) is accurate.
- The `today() - 30` syntax for date arithmetic is valid in ClickHouse (subtracting an integer from Date subtracts that many days).
- The `toYYYYMM`, `toStartOfHour`, and `toStartOfDay` functions are all correct and current.
- The LowCardinality(String) usage is appropriate for event_type columns with limited distinct values.
