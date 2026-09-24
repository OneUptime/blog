# Validation Summary: How to Compute a Weighted Average in PromQL from Separate Sum and Count Metrics

## Status
validated

## Post Type
Technical tutorial / guide.

## Technologies Covered
- Prometheus and PromQL
- Classic histograms, summaries, and native histograms
- Prometheus recording rules and YAML
- Grafana duration display

## Sources Consulted
- Prometheus histogram and summary guidance: https://prometheus.io/docs/practices/histograms/#count-and-sum-of-observations
- PromQL operators, comparisons, and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- PromQL functions, including `rate()`, `increase()`, and `histogram_avg()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- PromQL selectors and range syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus recording-rule best practices: https://prometheus.io/docs/practices/rules/
- Prometheus recording-rule configuration: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana standard options and units: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Verified the numerical example: the instance means are 0.1 and 1 second, their unweighted mean is 0.55 seconds, and the combined mean is 11/101 = approximately 0.1089 seconds.
- Reviewed all three PromQL examples against documented syntax and semantics. Applying `rate()` to each counter before aggregation preserves reset handling; identical selectors and aggregation labels produce matching numerator and denominator groups.
- Confirmed that floating-point division follows IEEE 754 semantics, including NaN for 0/0. The denominator comparison without `bool` filters out zero values while preserving positive values; adding `bool` changes the calculation. Missing matching groups are omitted by default.
- Checked the YAML rule structure, indentation, metric names, and expressions against the recording-rule specification. Independently recording numerator and denominator rates preserves the weights needed for subsequent spatial aggregation. These recorded rates should not receive another counter `rate()` transformation.
- Confirmed the distinction between five-minute rates and a full-day calculation using matched counter increases. Both `rate()` and `increase()` extrapolate from scraped samples, so interval results are estimates rather than an exact event ledger.
- Confirmed the nonnegative-observation requirement for treating separate float sum series as counters and the native-histogram input requirement for `histogram_avg()`.
- The route matcher excludes exactly `/health`; it also admits series without a route label under PromQL matching semantics. Instrumentation must provide the intended labels and matching populations, as the post requires.
- Checked all linked documentation destinations and the author link. No version-specific or deprecated API corrections were necessary. Grafana supports configurable display units; the ratio's underlying unit is seconds per observation.
- This was a documentation-based review. `promtool` was not available locally, so no Prometheus runtime or fixture tests were executed. The README was left unchanged.
