# Validation Summary: How to Analyze Quality Control Data in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, aggregate functions)
- Statistical Process Control (SPC) concepts: X-bar control charts, Cpk
- Pareto analysis

## Sources Consulted
- ClickHouse documentation on aggregate functions (stddevSamp, stddevPop, countIf, round, least, nullIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on arithmetic operators (division returns Float64): https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse documentation on MergeTree engine and LowCardinality type: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- SQL standard on nested window function restrictions

## Issues Found
1. **Pareto Analysis query: nested window functions (lines 76-89)** — The `cumulative_pct` expression used `sum(round(count() / sum(count()) OVER () * 100, 2)) OVER (ORDER BY count() DESC)`, which nests a window function (`sum(count()) OVER ()`) inside another window function (`sum(...) OVER (ORDER BY ...)`). This is prohibited by the SQL standard and ClickHouse will reject it with an error. Fixed by extracting the first-pass computation (defect_count, total_defects, defect_pct) into a CTE (`WITH defect_stats AS (...)`) and then computing the cumulative sum in the outer query.

## Review Notes
- The X-bar control chart query uses `3 / sqrt(n)` as an approximation for the A₃ SPC constant. In rigorous SPC implementations, A₃ values come from statistical tables and depend on the subgroup size. The approximation is reasonable for a blog-level introduction but readers implementing production SPC should consult proper A₃/A₂ factor tables.
- The Cpk query uses hardcoded placeholder spec limits (USL=1.5, LSL=-1.5). The column name `usl_offset` is slightly misleading since it represents the USL value itself, not an offset. This is noted as a comment in the code, so it's acceptable.
- The control chart UCL/LCL will vary slightly per subgroup when subgroup sizes differ, since `sqrt(count())` uses the per-subgroup count. In standard SPC practice, control limits are typically constant across subgroups. This is a methodology simplification rather than a code error.
