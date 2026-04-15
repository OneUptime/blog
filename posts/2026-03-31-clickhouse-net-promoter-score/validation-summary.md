# Validation Summary: How to Calculate Net Promoter Score (NPS) in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- SQL aggregate functions (`countIf`, `argMax`, `round`, `count`)
- ClickHouse window functions (`OVER`)
- ClickHouse date functions (`today()`, `toStartOfMonth`)

## Sources Consulted
- ClickHouse documentation on aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse documentation on `argMax`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on date functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- Net Promoter Score methodology (Bain & Company standard definition)

## Issues Found
No technical issues found.

## Review Notes
- The NPS formula, category definitions (Promoters 9-10, Passives 7-8, Detractors 0-6), and range (-100 to +100) are all correct per the standard NPS methodology.
- All ClickHouse SQL syntax is valid: `countIf`, `argMax`, `toStartOfMonth`, `today() - N` (date arithmetic), `round`, window functions with `OVER ()`, and `JOIN ... USING` syntax.
- The table schema uses appropriate ClickHouse types (`UUID`, `UInt64`, `UInt8`, `DateTime`) and `MergeTree()` engine.
- The "NPS by Product Segment" query references a `users` table not defined in the post, but this is acceptable since it is clearly illustrative and the JOIN pattern is correct.
- The deduplication approach using `argMax(score, submitted_at)` grouped by `user_id` is an idiomatic ClickHouse pattern for getting the latest value per group.
- Window functions (`sum(count()) OVER ()`) require ClickHouse 21.x or later, but this is not a concern for modern deployments.
