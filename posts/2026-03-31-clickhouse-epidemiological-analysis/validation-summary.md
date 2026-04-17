# Validation Summary: How to Build Epidemiological Analysis with ClickHouse

## Status
validated

## Post Type
Tutorial / Reference (ClickHouse SQL recipes for public-health analytics)

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, Date arithmetic, aggregate combinators)
- SQL (epidemiological analysis patterns: rolling incidence, CFR, VE estimation, Rt approximation)

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse window functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse `lagInFrame`: https://clickhouse.com/docs/sql-reference/window-functions/lagInFrame
- ClickHouse aggregate combinators (`-If`): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions (`today`, `toStartOfWeek`, `toYear`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse data types (`LowCardinality`, `FixedString`, `UUID`): https://clickhouse.com/docs/sql-reference/data-types

## Issues Found
1. **Variant Dominance query — alias inside `PARTITION BY`**: the original query used `PARTITION BY week` where `week` is a `SELECT`-list alias (`toStartOfWeek(report_date) AS week`). ClickHouse window-function resolution is not guaranteed to accept `SELECT` aliases inside `OVER`, and the docs only show expressions. Replaced with the explicit expression `PARTITION BY toStartOfWeek(report_date)` for version-robust behavior. Semantics are unchanged.
2. **Approximate Rt query — `lagInFrame` default frame**: the original `lagInFrame(count(), 7) OVER (ORDER BY report_date)` relied on the implicit `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` frame. `lagInFrame` respects the window frame for physical-row lookups and the documented example form uses an explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` frame. Added the explicit frame so the 7-row lookback reliably returns the target row instead of the default value, which would otherwise zero out all `cases_7d_ago` values and filter every row out via `WHERE cases_7d_ago > 0`.

## Review Notes
- `toStartOfWeek(report_date)` defaults to mode 0 (Sunday-starting weeks). If the author wants ISO weeks (Monday-starting), they can pass `toStartOfWeek(report_date, 1)` — not an error, just a convention to flag.
- The "Approximate Rt" formula `pow(cases / cases_7d_ago, 1/7)` is a rough daily growth-rate approximation, not a true effective reproduction number (which depends on the serial-interval distribution). The post already labels this as approximate; worth noting that methods like Cori et al. (EpiEstim) or Wallinga-Teunis are more epidemiologically rigorous for production surveillance.
- `today() - 90` is the idiomatic ClickHouse form for Date-integer subtraction and is correct.
- `PARTITION BY toYear(report_date)` yields one partition per year — appropriate for multi-year case tables; for very long histories with sparse per-year data it could be relaxed to `toYYYYMM`.
