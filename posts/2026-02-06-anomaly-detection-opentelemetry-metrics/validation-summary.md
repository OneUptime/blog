# Validation Summary: How to Build Automated Anomaly Detection from OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry Python SDK
- OTLP HTTP metric exporter
- Python
- NumPy
- Statistical anomaly detection
- Z-score baselines
- Alerting and observability pipelines

## Sources Consulted
- OpenTelemetry Python instrumentation documentation for metrics, MeterProvider, PeriodicExportingMetricReader, synchronous instruments, and asynchronous instruments: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation for Counter, Histogram, Gauge, get_meter, and set_meter_provider: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation for `OTLPMetricExporter`: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Metrics API specification for Counter, Histogram, Gauge, ObservableGauge, and UpDownCounter behavior: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry resource documentation for service identity and resource attributes: https://opentelemetry.io/docs/concepts/resources/
- Python `datetime` documentation for timezone-aware UTC timestamps and `utcnow()` deprecation guidance: https://docs.python.org/3.12/library/datetime.html
- NumPy documentation for `mean` and `std`: https://numpy.org/doc/stable/reference/generated/numpy.mean.html and https://numpy.org/doc/stable/reference/generated/numpy.std.html

## Issues Found
- The detector defaulted to `min_samples=10` while the baseline calculator defaulted to a 4-week lookback. Because each day-of-week/hour bucket only gets about one sample per week, the example would not detect anomalies with the defaults. Changed `min_samples` to 4 and updated the explanatory text accordingly.
- The baseline example used `datetime.utcnow()` and `datetime.fromtimestamp(timestamp)` without a timezone. Changed these to `datetime.now(timezone.utc)` and `datetime.fromtimestamp(timestamp, tz=timezone.utc)` to avoid deprecated naive UTC handling and local-time grouping errors.
- The baseline query comment and surrounding explanation could imply anomaly detection on raw cumulative counters. Added a clarification that counters should be converted to rates or deltas over a fixed window before anomaly detection.
- The detector mutated `baseline.std_dev` when applying the minimum standard deviation floor. Changed this to use a local `std_dev` value so checking one metric value does not modify the stored baseline.
- The `anomaly_reporter.py` snippet used `Anomaly` in a type annotation without importing it. Added `from detector import Anomaly` so the snippet is valid as a standalone file.

## Review Notes
- The Python snippets compile syntactically after the fixes.
- OpenTelemetry API availability was checked with current packages installed into an isolated `/tmp` target directory; `create_counter`, `create_histogram`, `create_gauge`, `Gauge.set`, and `OTLPMetricExporter` were available.
- The metric names are treated as custom metrics rather than strict OpenTelemetry semantic convention examples.
