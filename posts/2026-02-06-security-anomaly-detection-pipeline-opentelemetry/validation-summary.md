# Validation Summary: How to Build a Security Anomaly Detection Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- Python async code
- NumPy statistical baselines
- Security anomaly detection
- Observability pipelines

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry system metric semantic conventions, confirming `By` as the UCUM byte unit convention: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- NumPy statistics documentation: https://numpy.org/doc/stable/reference/routines.statistics.html

## Issues Found
- The payload size histograms used `unit="bytes"`. OpenTelemetry accepts unit strings as opaque values, but the Python API documentation recommends UCUM units and gives `By` as the byte unit. Changed request and response payload histogram units to `unit="By"`.
- The `signal_collector.py` snippet used metric instruments defined in `security_metrics.py` without importing them. Added imports for `data_access_counter`, `request_counter`, and `request_payload_size`.
- The `anomaly_detector.py` snippet referenced `BaselineComputer` and `send_security_alert` without imports. Added imports to make the cross-file dependencies explicit.
- The `pipeline_runner.py` snippet referenced `logging`, `AnomalyDetector`, `baseline_computer`, and `fetch_metrics_window` without showing how they were supplied. Added the missing imports and initialized a `BaselineComputer` instance.

## Review Notes
The examples are illustrative and still assume application-specific implementations for helpers such as `fetch_metrics_window` and `send_security_alert`. The OpenTelemetry API calls checked in the post are current: `metrics.get_meter`, `create_counter`, `create_histogram`, `Counter.add`, `Histogram.record`, `trace.get_tracer`, `start_as_current_span`, span attributes, and span events all match the documented Python APIs.
