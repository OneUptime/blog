# Validation Summary: How to Create Percentile Metrics

## Status
validated

## Post Type
Tutorial / Guide — covers theory plus runnable Python examples and Prometheus/OpenTelemetry configuration for implementing percentile metrics.

## Technologies Covered
- Prometheus histograms and PromQL (`histogram_quantile`, `rate`, recording rules, alerting rules)
- Python `prometheus_client` library
- OpenTelemetry Python SDK (`opentelemetry.sdk.metrics`)
- Grafana dashboard queries
- SLO/SLI patterns and Apdex score

## Sources Consulted
- Prometheus docs — Histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus docs — `histogram_quantile()`: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus `client_python` source / docs: https://github.com/prometheus/client_python
- OpenTelemetry Python metrics API/SDK docs: https://opentelemetry-python.readthedocs.io/
- OpenTelemetry HTTP semantic conventions (stable): https://opentelemetry.io/docs/specs/semconv/http/http-metrics/ and https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic conventions stability migration: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- Apdex specification: https://en.wikipedia.org/wiki/Apdex

## Issues Found

1. **Apdex PromQL formula was mathematically wrong.** The original expression evaluated to `bucket{le="0.4"} / (2 * total)` instead of the Apdex formula `(Satisfied + Tolerating/2) / Total`. It dropped the full-weight Satisfied count and halved the entire cumulative-to-400ms bucket. Replaced with the explicit form `(S + (B − S) / 2) / Total`, which correctly implements `(Satisfied + Tolerating/2) / Total`. Also added a comment naming the formula and clarified that "Satisfied" is `<= 100ms` (consistent with the inclusive `le` semantics).

2. **`HistogramBucket.upper_bound` doc comment said "(exclusive)" but the implementation is inclusive.** Prometheus's `le` bucket bounds are inclusive (an observation equal to the boundary lands in that bucket), and the post's `observe` method correctly uses `latency_ms <= bucket.upper_bound`. Updated the comment to "(inclusive)" so the doc matches the code and the Prometheus convention.

3. **OpenTelemetry HTTP attribute names used the deprecated pre-stable form.** The OTel example used `http.method` and `http.status_code`, which were superseded when HTTP semantic conventions reached stable in November 2023 (semconv v1.23.1). The metric name in the example (`http.server.request.duration`) is the new stable form, so the attributes were inconsistent with the metric name. Updated to `http.request.method` and `http.response.status_code`. `http.route` was already correct (unchanged across versions).

4. **Opening paragraph stated "Half your users might be experiencing 500ms+ latency" alongside a 50ms average.** This is mathematically impossible: if 50% of users have 500ms+ latency, the average is at least 250ms. Softened to "A significant slice of your users…" to preserve the rhetorical thrust without making a logically impossible claim.

## Review Notes

- The `calculate_percentile` example uses `int((P/100) * N)` rather than the canonical nearest-rank `ceil((P/100) * N)`. Both produce valid quantile estimates for educational purposes and the function clamps to a valid index, so I did not change it; future revisions could mention this is the "lower" quantile method.
- The custom `LatencyHistogram.estimate_percentile` uses linear interpolation between cumulative bucket bounds — matching how Prometheus's `histogram_quantile` works for non-`+Inf` buckets. It would return `+Inf` if the target lands in the `+Inf` bucket (since the upper bound is infinite); Prometheus handles this edge case by returning the second-to-last bound. Minor and out of scope for a corrective edit.
- The database OpenTelemetry attributes (`db.operation`, `db.sql.table`, `db.system`) are the pre-stable names. Database semantic conventions have been migrating to `db.operation.name`, `db.collection.name`, and `db.system.name`. As of the review date these newer names are still being rolled out across instrumentations, so the post's choices remain functional. A future update could revisit once the database conventions are universally stable.
- The "WRONG: Averaging percentiles" PromQL example in the Pitfalls section is intentionally an anti-pattern; the syntax used (no `by (le)`) is precisely the misuse being illustrated, so it was left untouched.
