# Validation Summary: How to Implement Growth Projection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- pandas
- SciPy
- statsmodels
- matplotlib
- Mermaid
- Prometheus/InfluxDB-style monitoring data

## Sources Consulted
- pandas DataFrame.resample API documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.resample.html
- pandas time series / date functionality user guide: https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html
- SciPy stats.linregress API documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html
- statsmodels seasonal_decompose API documentation: https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html

## Issues Found
- The end-to-end pipeline aggregated raw `value` data into daily columns named `mean`, `max`, and `p95`, but later functions still read `df['value']`. Added a `metric_series()` helper and updated modeling/seasonality functions to work with either raw or aggregated data.
- The exponential model aligned log-transformed positive values with `x[:len(log_values)]`, which is incorrect when non-positive values are not all at the end of the series. Updated it to use a positive-value mask for both `x` and `values`.
- The interval calculations used SciPy `linregress` `stderr`, which is the standard error of the estimated slope, not the residual standard error of the fitted model. Updated the linear and exponential forecast intervals to use residual standard error.
- The seasonal projection path always recomputed a linear base projection, so exponential projections were ignored when seasonality was enabled. Updated `project_with_seasonality()` to accept the already-selected base projection.
- The seasonal adjustment code mutated the input DataFrame and assumed a `value` column. Updated it to work on a copy and select `value` or `mean` as appropriate.
- The seasonality decomposition example returned additive seasonal components under the name `seasonal_factors`, which could be confused with multiplicative factors. Renamed the return key to `seasonal_adjustments` and clarified the `period` requirement.
- Updated hourly pandas frequency aliases from deprecated uppercase `H` to lowercase `h`.

## Review Notes
The examples are educational snippets and still assume the reader connects `collect_metrics()` to a real monitoring backend. The Python snippets were syntax-checked with `python3` AST parsing, but dependency-level runtime execution was not performed because pandas, SciPy, and statsmodels are not installed in the local environment.
