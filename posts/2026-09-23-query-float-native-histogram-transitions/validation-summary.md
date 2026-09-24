# Validation Summary: How to Query Float-to-Native-Histogram Transitions Without Omissions

## Status

validated

## Post Type

Technical guide with PromQL examples and HTTP API inspection commands.

## Technologies Covered

- Prometheus and native histograms
- PromQL range selectors, functions, and set operators
- Prometheus HTTP API and recording rules
- curl, Bash, and jq

## Sources Consulted

- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — mixed-sample handling, annotations, histogram count and sum, and vector construction.
- [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#range-vectors) — instant queries, timestamps, response annotations, and mixed matrix results.
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — label matching, set union and complement, and aggregation.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) — sample types, selectors, and evaluation windows.
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — recording expression results as new series.
- [curl manual](https://curl.se/docs/manpage.html) — GET requests, URL encoding, and error/output flags.
- [jq manual](https://jqlang.org/manual/) — object construction, shorthand fields, and nested field access.
- [Author's GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found

1. **Zero fallback behavior was imprecise.** The original wording suggested that `or vector(0)` replaces missing calculations and loses their labels. Updated it to explain that it adds an unlabeled zero unless an unlabeled result already exists. Missing labeled series remain missing, and a zero can appear alongside valid labeled results. This follows PromQL union semantics.
2. **Historical interval splitting needed a lookback constraint.** Splitting a report at the transition does not constrain the samples selected by subsequent rate evaluations. Added that each rate lookback must contain only one sample type, because a window can still reach back across the transition.

## Review Notes

- Reviewed all PromQL examples against current official documentation. The function table and the last-two-sample distinction for `irate` and `idelta` are accurate.
- Confirmed that `present_over_time(...) unless rate(...)` detects unavailable results, including causes other than a type transition. It does not establish that an available rate is semantically appropriate for the metric.
- Confirmed the API supports an instant query returning a range vector with both `values` and `histograms`, and optional top-level `warnings` and `infos`. The supplied timestamp is valid RFC3339.
- Confirmed the operation-count comparison requires one observation per completed operation. Separate series identities prevent mixed-type windows; producer population checks remain necessary before combining rates.
- Reviewed the recording-rule omission and partial-total explanation against documented query and recording behavior.
- Both Bash examples passed `bash -n`. curl flags and jq filters were checked against their official manuals. No live Prometheus dataset was used, so this review does not claim end-to-end execution against the illustrative deployment.
- The post specifies no Prometheus version. Findings apply to the current documentation consulted on 2026-09-24; older deployments may differ in native histogram support and annotations.
- Preserved the post's structure and examples; only the two technical explanations above were changed.
