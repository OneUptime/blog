# Validation Summary: How to Use corr() Function for Correlation in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL aggregate functions)
- `corr()` aggregate function and its `-State`/`-Merge` combinators
- `AggregatingMergeTree` engine and materialized views
- Related aggregate/date-time functions: `covarSamp`, `stddevSamp`, `countIf`, `quantile`, `toStartOfMinute`, `toStartOfHour`, `toDate`, `today()`, `now()`
- Pearson correlation coefficient (statistics)

## Sources Consulted
- ClickHouse official docs for `corr` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr
- ClickHouse docs for aggregate function combinators (`-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs for `AggregatingMergeTree`: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse docs for `AggregateFunction` data type: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse docs for date/time functions (`toStartOfMinute`, `toStartOfHour`, `toDate`, `today`, `now`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs for `quantile` parametric syntax: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- Standard Pearson correlation coefficient definition (for the `covarSamp/(stddevSamp*stddevSamp)` equivalence)

## Issues Found
No technical issues found.

Verified claims:
- `corr(x, y)` returns the Pearson correlation coefficient as a `Float64` in `[-1, 1]`.
- The stated mathematical equivalence `covarSamp(x, y) / (stddevSamp(x) * stddevSamp(y))` is correct — the `(n-1)` Bessel factors cancel between numerator and denominator, yielding the same value as ClickHouse's standard formula `Σ((x − x̄)(y − ȳ)) / √(Σ(x − x̄)² · Σ(y − ȳ)²)`.
- `corrState` and `corrMerge` combinators are valid for `corr` and compose correctly with `AggregatingMergeTree`.
- `AggregateFunction(corr, Float64, Float64)` column type declaration is syntactically correct.
- Date/time helpers (`toStartOfMinute`, `toStartOfHour`, `toDate`, `today()`, `now() - INTERVAL N HOUR/DAY`) are valid.
- Parametric `quantile(0.25)(col)` syntax is correct.
- `countIf(status_code >= 500) / count()` is a valid expression for error rate.
- SQL examples are syntactically correct; qualifying `host_metrics.metric_time` alongside `USING (host_name)` is accepted by ClickHouse.

## Review Notes
- The materialized view example joins `request_logs` with `host_metrics` and is triggered only by inserts into the left table (`request_logs`) — this is standard ClickHouse MV behavior. Readers running this in production should be aware that rows arriving in `host_metrics` alone will not trigger the MV.
- Several columns (`timestamp`, `service_name`, `cpu_percent`, `response_time_ms`, `host_name`) are used in join examples without explicit table qualification. Queries work as long as column names are unambiguous, but in real schemas users may need to qualify them.
- The `CASE` expression in the "Interpreting Correlation Strength" section recomputes `corr(...)` four times. This is correct, and ClickHouse will typically compute the underlying aggregate state efficiently, but it is slightly redundant.
- The post correctly notes that Pearson correlation only captures *linear* relationships and that correlation does not imply causation — good caveats for a statistics-heavy topic.
