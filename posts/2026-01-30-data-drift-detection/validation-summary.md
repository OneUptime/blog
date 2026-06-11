# Validation Summary: How to Build Data Drift Detection Details

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Python
- NumPy
- pandas
- SciPy statistical tests
- OpenTelemetry Python metrics SDK and OTLP exporters
- OneUptime telemetry ingestion
- Data drift detection for MLOps

## Sources Consulted
- SciPy `ks_2samp` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html
- SciPy `chisquare` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chisquare.html
- SciPy `rel_entr` documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.rel_entr.html
- NumPy `histogram` documentation: https://numpy.org/doc/stable/reference/generated/numpy.histogram.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- Corrected the KS test result comment. The p-value is not the probability that two distributions are the same; it is the probability of observing a statistic at least as extreme under the null hypothesis.
- Renamed the categorical drift helper from `ks_drift_test_categorical` to `chi_squared_drift_test` because the implementation uses SciPy's chi-squared test, not KS.
- Fixed the categorical chi-squared expected counts so zero expected categories are avoided while preserving the total expected count required by SciPy's `chisquare`.
- Fixed Jensen-Shannon divergence scaling. The code used natural logarithms through SciPy `rel_entr`, so the raw value is bounded by `ln(2)`, not 1. The code now normalizes by `log(2)` to match the documented 0-to-1 range.
- Updated `DriftMonitor` to use pandas numeric dtype detection instead of checking only `dtype != object`, which fails for non-object non-numeric dtypes such as categorical columns.
- Added `chi2` as a supported drift method in `DriftMonitor` and updated the example category feature configuration to use it instead of PSI, which only works for numeric histogram comparisons in the provided implementation.
- Updated KS and chi-squared monitor handling so thresholds are used as significance levels and drift detection follows the statistical test result rather than comparing the test statistic to the alpha value.
- Fixed current statistics collection for categorical features so string/category arrays do not call numeric mean and standard deviation functions.
- Fixed the OpenTelemetry observable gauge example by adding callbacks that yield `Observation` objects, as required by the OpenTelemetry Python metrics API.
- Updated the OneUptime OpenTelemetry exporter example to use the OTLP HTTP metric exporter with the documented OneUptime endpoint and `x-oneuptime-token` header instead of an unsupported `otlp.oneuptime.com:4317` endpoint.

## Review Notes
- The Python examples compile syntactically when extracted from the post. They are presented as separate files, so full runtime execution would require assembling the snippets and installing dependencies.
- The post still uses illustrative alert-rule JSON for OneUptime rather than a verified OneUptime API or Terraform schema. It is clearly framed as an example configuration.
