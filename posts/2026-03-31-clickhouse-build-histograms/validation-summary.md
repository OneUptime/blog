# Validation Summary: How to Build Histograms in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse `histogram` parametric aggregate function
- ClickHouse array/tuple functions (`arrayJoin`)
- ClickHouse conditional and math functions (`multiIf`, `intDiv`, `pow`, `log10`, `floor`, `round`)
- Window functions (`sum(...) OVER ()`)

## Sources Consulted
- ClickHouse docs — Parametric aggregate functions (histogram): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions
- ClickHouse docs — `arrayJoin`: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse docs — `multiIf`, `intDiv`, `round`, `pow`, `log10`, `floor` reference pages
- Ben-Haim & Tom-Tov, "A Streaming Parallel Decision Tree Algorithm" (algorithm cited in ClickHouse docs for `histogram`)

## Issues Found
- **Incorrect algorithm attribution for `histogram()`**: The post claimed ClickHouse's `histogram` function "automatically computes optimal bucket widths using Sturges' rule." This is wrong. According to ClickHouse's documentation, `histogram(N)(x)` computes an adaptive histogram using the streaming algorithm from Ben-Haim & Tom-Tov ("A Streaming Parallel Decision Tree Algorithm"), and `N` is the maximum number of bins, explicitly supplied by the caller — it does not auto-derive the bin count via Sturges' rule. Rewrote the sentence to describe the actual behavior (adaptive streaming algorithm producing typically unequal bin widths, with the user supplying the bin count).

## Review Notes
- The third element of each `histogram` tuple is documented as "height" (a `Float64` approximating the count). The post labels it `count`, which is the common pragmatic interpretation and is acceptable for this tutorial context.
- The log-scale query correctly excludes `latency_ms = 0` (`log10(0)` is undefined); good defensive filter.
- `ORDER BY min(latency_ms)` after `GROUP BY latency_bucket` relies on implicit aggregation of `min` over the group, which ClickHouse supports; behavior is correct.
- Using `tuple` as a column alias is allowed in ClickHouse (it is not a reserved keyword), though it shadows the `tuple()` function name — a future edit could rename it for clarity, but it is not a bug.
