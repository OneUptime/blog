# Validation Summary: How to Calculate Standard Deviation Bands in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL / window functions)
- Statistical analytics (standard deviation, Bollinger Bands)

## Sources Consulted
- ClickHouse aggregate functions reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse aggregate functions reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/avg
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `WINDOW` clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/window-view
- Investopedia Bollinger Bands definition (standard 20-period SMA with 2 standard deviations)

## Issues Found
No technical issues found.

## Review Notes
- `stddevPop` is the correct ClickHouse function for population standard deviation; `stddevSamp` would be the alternative for sample standard deviation. The post consistently uses `stddevPop`, which is appropriate for treating the window as the full series.
- `ROWS BETWEEN 19 PRECEDING AND CURRENT ROW` yields a 20-row window, matching the conventional 20-period Bollinger Band.
- The "approximately 95%" claim for 2-sigma is a standard approximation; the exact figure for a normal distribution is ~95.45%.
- The bandwidth formula `(upper - lower) / mid` matches the standard Bollinger Band %B / bandwidth definition.
- Referencing the `band_position` alias in the `WHERE` clause of the "Detecting Breakouts" query relies on ClickHouse's non-standard alias-in-WHERE support, which is documented and supported in ClickHouse (though not portable to standard SQL engines). This is acceptable for a ClickHouse-specific post.
