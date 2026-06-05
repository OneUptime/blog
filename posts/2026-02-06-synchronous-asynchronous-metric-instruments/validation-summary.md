# Validation Summary: How to Choose Between Synchronous and Asynchronous Metric Instruments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry Python API
- Python
- psutil
- Observability metric instrument selection

## Sources Consulted
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics supplementary guidelines: https://opentelemetry.io/docs/specs/otel/metrics/supplementary-guidelines/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- psutil documentation: https://psutil.readthedocs.io/stable/

## Issues Found
- The post said OpenTelemetry offers two flavors of every metric instrument. This was inaccurate because there is no asynchronous Histogram, and the current Metrics API also includes a synchronous Gauge. Changed the introduction to say OpenTelemetry offers synchronous and asynchronous instruments without implying a one-to-one pair for every instrument.
- The synchronous instrument table listed only Counter, UpDownCounter, and Histogram. Added Gauge with its `set(value)` operation, matching the current Python Metrics API.
- The asynchronous section said the asynchronous instruments mirror the synchronous ones. Changed this to "There are three asynchronous instrument types" to avoid implying an ObservableHistogram.
- The decision framework only routed point-in-time values to ObservableGauge. Added synchronous Gauge guidance for point-in-time values recorded when they change, while keeping ObservableGauge for callback-read snapshots.
- The disk I/O example said the SDK computes the rate of change between collections. ObservableCounter callbacks report cumulative monotonic values; rate derivation depends on metric reader temporality or the backend. Reworded this to avoid overclaiming SDK behavior.
- The histogram explanation said histograms need every individual value to compute percentiles. Reworded this to say histograms need individual measurements to populate distribution buckets accurately, which is closer to the OpenTelemetry histogram model.

## Review Notes
- The Python examples use illustrative application objects such as `gateway`, `PaymentError`, and `db_pool`; these are acceptable placeholders in context.
- The `psutil.cpu_percent(percpu=True)` example is valid, but psutil documents that the first non-blocking call may return a meaningless `0.0`, so production code may want to prime or ignore the first reading.
