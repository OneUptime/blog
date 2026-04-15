# Validation Summary: How to Use WITH Clause for Reusable Subqueries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, WITH clause / CTEs)
- Common Table Expressions (CTEs)
- ClickHouse window functions (`lagInFrame`)
- ClickHouse aggregate functions (`countIf`, `quantile`, `count()`)
- ClickHouse date/time functions (`dateDiff`, `toDate`, `today`, `now`)

## Sources Consulted
- ClickHouse official documentation on WITH clause: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse official documentation on aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse official documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation on dateDiff: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff

## Issues Found
No technical issues found.

## Review Notes
- All six SQL examples use correct ClickHouse syntax and would execute as expected given appropriate table schemas.
- The scalar WITH syntax (`WITH (SELECT ...) AS name`) is a ClickHouse-specific feature distinct from standard SQL CTEs; the post correctly demonstrates both patterns separately.
- The performance note about CTEs being evaluated independently (inlined/substituted rather than materialized) is accurate and important — this is a key behavioral difference from databases like PostgreSQL where CTEs were historically optimization fences.
- The recommendation to use temporary tables for expensive, multiply-referenced CTEs is sound practical advice.
- The post correctly notes that ClickHouse does not support recursive CTEs (`WITH RECURSIVE`).
- `lagInFrame` is used rather than `lag`; both work in modern ClickHouse, but `lagInFrame` is the historically standard ClickHouse variant and is correct here.
