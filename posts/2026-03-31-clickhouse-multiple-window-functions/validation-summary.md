# Validation Summary: How to Use Multiple Window Functions in One Query in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL Window Functions (rank, sum, avg, lag, lead, count)
- WINDOW clause (named window definitions)
- MergeTree table engine

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- SQL standard window function specification (ISO/IEC 9075) for named window inheritance rules
- ClickHouse SQL syntax reference for SELECT statement clause ordering

## Issues Found

1. **WINDOW clause placement (all 5 queries):** The WINDOW clause was placed before the FROM clause in every query that used it. In ClickHouse (and standard SQL), the WINDOW clause must appear after FROM (and WHERE/GROUP BY/HAVING), not before it. Fixed by moving `WINDOW ... AS (...)` to after `FROM product_sales` in all affected queries.

2. **Invalid ORDER BY override on named window:** The query `rank() OVER (w ORDER BY revenue DESC)` referenced a named window `w` that already had `ORDER BY sale_date`. Per the SQL standard and ClickHouse's implementation, you cannot specify an ORDER BY in a window reference if the base named window already defines one. Fixed by changing rank() to use a full inline OVER clause with its own PARTITION BY and ORDER BY, and updated the explanation to note this restriction.

3. **Incorrect default frame behavior claim:** The "Mixing Partition-Level and Row-Level Calculations" section claimed that omitting the frame clause on a window with ORDER BY "defaults to the whole window." This is incorrect — when ORDER BY is present, the default frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (cumulative), not the entire partition. Fixed by adding explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` frames for the all-time average calculations, and updated the explanation to describe the correct default frame behavior.

4. **Summary text inaccuracy:** The summary stated named windows can be extended with "additional ORDER BY clauses or frame specifications." Removed the ORDER BY claim since this is not allowed when the base window already defines an ORDER BY.

## Review Notes
- The `lag(value, offset, default)` three-argument form is used in the "Lead and Lag" section. While ClickHouse documentation primarily shows the two-argument form, the three-argument form is supported as standard SQL syntax. The alternative `lagInFrame` function is ClickHouse-specific and offers similar default-value behavior but operates within the frame rather than the partition.
- The percentile calculation in "Ranking and Percentile Together" would produce a division-by-zero error if a partition had only one row (count - 1 = 0). This is safe with the example data (5 rows per product) but could be a concern with real-world data. Not changed since the post uses controlled sample data.
- The first query (without WINDOW clause) was syntactically correct and required no changes.
