# Validation Summary: How to Create Sum Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK (metrics API: Counter, UpDownCounter, ObservableCounter, Histogram)
- OTLP gRPC Metric Exporter
- PromQL (rate, increase, sum aggregation, by/without grouping)
- Prometheus exposition format (_sum, _count, _bucket suffixes)
- UCUM units (By, s, ms, dimensionless annotations like `{request}`)
- Aggregation temporality (Cumulative vs Delta)

## Sources Consulted
- OpenTelemetry Python API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html (callback signature for observable instruments)
- OpenTelemetry Python SDK metrics export module (PeriodicExportingMetricReader, AggregationTemporality, preferred_temporality)
- Prometheus PromQL documentation (rate, increase, sum aggregation operators)
- OpenTelemetry semantic conventions for units (UCUM)
- OpenTelemetry specification on aggregation temporality (cumulative vs delta)

## Issues Found
- **Observable counter callback was missing the `options` parameter.** The example defined `def get_disk_bytes_read():` with no arguments, but the OpenTelemetry Python SDK invokes callbacks as `callback(options)` where `options` is a `CallbackOptions` instance. Running the original code would raise `TypeError: get_disk_bytes_read() takes 0 positional arguments but 1 was given`. Fixed by changing the signature to `def get_disk_bytes_read(options):` and updating the docstring to mention the `CallbackOptions` parameter.

## Review Notes
- The `preferred_temporality` snippet uses `Counter` and `Histogram` as dict keys without showing the import (`from opentelemetry.sdk.metrics import Counter, Histogram`). This is presented as an illustrative partial snippet, so the omission is acceptable, but readers wiring this in production should import the instrument classes.
- The post's use of `.total` suffix in OTLP instrument names (e.g., `network.bytes.total`) is a stylistic choice. OpenTelemetry semantic conventions generally avoid `.total` in the OTLP name because Prometheus exporters add `_total` automatically during name normalization, which can result in `_total_total`. This is a style/convention concern rather than a correctness bug, so it was not changed.
- The histogram example references `time.time()` without showing `import time` in that specific snippet, but the complete example near the end of the post imports `time` correctly. This is acceptable as a partial snippet.
- PromQL queries on raw counters in "Querying Running Totals" (`sum by (customer_id) (api_quota_used_total)`) sum cumulative counter values across instances. This works but can be misleading after restarts; the post correctly recommends `rate()` / `increase()` in the Best Practices section, so the message is consistent overall.
