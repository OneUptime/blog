# Validation Summary: How to Use quantileTiming() in ClickHouse for Latency Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL aggregate functions (`quantileTiming`, `quantilesTiming`, `quantile`)
- ClickHouse combinators (`-If`)
- MergeTree engine

## Sources Consulted
- ClickHouse official docs — `quantileTiming`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletiming
- ClickHouse official docs — `quantile`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse docs on aggregate function combinators (`-If`, `-Array`, etc.)
- ClickHouse docs on MergeTree engine

## Issues Found
- **Outliers section — inaccurate qualifier**: The post originally read "Values above ~30 seconds are clamped in some ClickHouse versions." The 30,000 ms clamp is the documented, universal behavior of `quantileTiming()` across all supported versions (not version-dependent). Updated the text to: "Values above 30,000 ms (30 seconds) are always clamped to 30,000 by `quantileTiming()`." This aligns with the official docs: "If the value is greater than 30,000 ... it is assumed to be 30,000."

## Review Notes
- The `quantile()` vs `quantileTiming()` comparison is accurate: `quantile()` uses reservoir sampling (non-deterministic, reservoir size up to 8192), while `quantileTiming()` is deterministic with fixed memory consumption.
- The parametric syntax `quantileTiming(level)(expr)` and multi-level `quantilesTiming(l1, l2, ...)(expr)` are both correctly shown.
- The `-If` combinator usage (`quantileTimingIf`) is correct — it is a standard aggregate function combinator in ClickHouse.
- The SQL in the "Handling Outliers" section is functionally redundant (ClickHouse already clamps internally), but it is not technically incorrect and serves as illustrative pre-filter logic.
- Accuracy caveat from official docs (not mentioned in the post but worth noting for future readers): precision degrades for values > 1,024 ms (results round to the nearest 16 ms) and for datasets larger than 5,670 values.
- The `CREATE TABLE` example with `MergeTree`, `PARTITION BY toYYYYMM(...)`, and `ORDER BY (endpoint, event_time)` is syntactically and semantically valid.
