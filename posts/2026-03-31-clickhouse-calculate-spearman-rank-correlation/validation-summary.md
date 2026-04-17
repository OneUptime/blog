# Validation Summary: How to Calculate Spearman Rank Correlation in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (SQL aggregate and window functions: `corr`, `rankCorr`, `row_number`, `rank`, `toStartOfHour`, `countIf`, `avg`)
- Spearman rank correlation (statistics)

## Sources Consulted
- ClickHouse `rankCorr` aggregate function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/rankCorr
- ClickHouse `corr` aggregate function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse date/time functions (`toStartOfHour`, `INTERVAL`) documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Wikipedia: Spearman's rank correlation coefficient

## Issues Found
- The post originally claimed "ClickHouse does not have a built-in `spearmanCorr()` function" and proceeded to show only a manual implementation. While there is no function literally named `spearmanCorr`, ClickHouse does provide a built-in `rankCorr(x, y)` aggregate function (added in v20.9) that computes Spearman's rank correlation coefficient directly. The claim was misleading and would push readers toward an unnecessarily complex manual approach. I rewrote the "Computing Spearman Correlation in ClickHouse" section to introduce `rankCorr()` as the built-in approach first, then keep the manual window-function approach as an alternative for cases where custom tie handling is needed.

## Review Notes
- The manual ranking approach using `row_number()` does not correctly handle ties — strict Spearman with ties uses averaged (fractional) ranks, while `row_number()` assigns unique ranks regardless of ties. The post's "Handling Ties" section addresses this by suggesting `rank()`, which uses skip-ranking (1, 2, 2, 4) — a common practical approximation, though still not the strict averaged-rank definition. This is acceptable for a practical tutorial and is a known trade-off when implementing Spearman in pure SQL; for exact results, the new `rankCorr()` recommendation is the better choice.
- All other SQL constructs (`toStartOfHour`, `countIf`, `INTERVAL 30 DAY`, window function syntax with `PARTITION BY ... ORDER BY`, `corr`) are valid ClickHouse syntax.
- The conceptual explanation of Spearman correlation (rank-then-Pearson, robustness to outliers, monotonic vs linear) is accurate.
