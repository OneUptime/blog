# Validation Summary: How to Optimize ClickHouse FINAL Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ReplacingMergeTree / CollapsingMergeTree engines
- FINAL modifier
- ClickHouse aggregate functions (argMax)
- ClickHouse system tables (system.query_log)

## Sources Consulted
- ClickHouse FROM clause / FINAL docs: https://clickhouse.com/docs/sql-reference/statements/select/from
- ClickHouse argMax function docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse LIMIT BY docs: https://clickhouse.com/docs/sql-reference/statements/select/limit-by
- ClickHouse OPTIMIZE statement docs: https://clickhouse.com/docs/sql-reference/statements/optimize
- ClickHouse system.query_log docs: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse date/time functions docs: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse deduplication strategies: https://clickhouse.com/docs/guides/developer/deduplication
- GitHub PR #10463 — initial parallel FINAL (v20.5): https://github.com/ClickHouse/ClickHouse/pull/10463
- GitHub PR #36396 — improved parallel FINAL (v22.6): https://github.com/ClickHouse/ClickHouse/pull/36396
- GitHub PR #47915 — max_final_threads default changed to num cores (v23.3): https://github.com/ClickHouse/ClickHouse/pull/47915

## Issues Found

1. **Incorrect setting name `max_threads_for_select_final`**: The post used the non-existent setting name `max_threads_for_select_final`. The correct ClickHouse setting is `max_final_threads`. Fixed both the SQL `SET` statement and the XML configuration snippet.

2. **Incorrect version for parallel FINAL ("22.8+")**: The post claimed parallel FINAL was introduced in ClickHouse 22.8. Parallel FINAL was actually introduced in v20.5 (PR #10463, May 2020), with significant improvements in v22.6 (PR #36396). Fixed the version reference to "20.5+".

3. **Outdated claim that FINAL is "single-threaded by default"**: As of ClickHouse 23.3 (PR #47915), the `max_final_threads` setting defaults to the number of CPU cores, making FINAL parallel by default. Updated the "Why FINAL Is Slow" section to reflect both the historical and current behavior.

## Review Notes
- The `LIMIT 1 BY` alternative for deduplication is valid ClickHouse syntax but is a community pattern rather than an officially recommended approach in ClickHouse documentation. The officially documented alternatives are `GROUP BY` with aggregate functions like `argMax()`. The post's inclusion is still useful but readers should be aware it's not an official recommendation.
- The `OPTIMIZE TABLE ... FINAL` advice to run during off-peak hours is sound. ClickHouse's own documentation cautions against frequent use of this command as it is resource-intensive.
