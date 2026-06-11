# Validation Summary: How to Implement Histogram Bucket Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus classic histograms
- Prometheus native histograms
- PromQL `histogram_quantile`
- Prometheus Python client
- Prometheus Go client
- OpenTelemetry Python metrics views
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector OTLP exporter
- NumPy percentile and histogram functions

## Sources Consulted
- Prometheus histogram and summary best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus native histogram specification: https://prometheus.io/docs/specs/native_histograms/
- Prometheus PromQL function documentation for `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Python client histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Go client `HistogramOpts` documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- OpenTelemetry Python metrics view documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor

## Issues Found
- Prometheus Python client examples manually appended `float('inf')` to bucket lists. The official client appends `+Inf` automatically, so the examples were updated to pass only finite bucket boundaries.
- The cardinality formula counted only buckets and omitted the automatically added `+Inf`, `_sum`, and `_count` time series for classic histograms. The formula and example were corrected.
- The OpenTelemetry Collector "drop unused buckets" example used an outdated/incorrect filter processor shape and treated `le` as a resource attribute. It was replaced with a Prometheus-compatible `metric_relabel_configs` example that can also be used under the Collector's Prometheus receiver.
- The native histogram section said Prometheus 2.40+ introduced native histograms without noting that they were experimental until Prometheus 3.8. The version wording was updated.
- The native histogram Prometheus config only set `scrape_protocols`. It now also sets `scrape_native_histograms: true`, which is required to ingest native histograms.
- The native histogram comparison table claimed a fixed `~1-2% error`. This was changed to note that precision depends on configured resolution.
- The Go `NativeHistogramBucketFactor` comment described the setting as `~10% bucket width`. It was clarified as a bucket growth factor.
- The OneUptime Collector example referenced a `prometheus` receiver in the pipeline but did not define it. A minimal receiver definition was added.

## Review Notes
The remaining bucket-count recommendations are reasonable rules of thumb rather than official limits. They should be treated as operational guidance that depends on retention, scrape interval, label cardinality, and backend cost model.
