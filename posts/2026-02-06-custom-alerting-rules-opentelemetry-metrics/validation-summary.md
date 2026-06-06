# Validation Summary: How to Build Custom Alerting Rules from OpenTelemetry Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python API and SDK
- OTLP HTTP metric export
- Python alert-rule evaluation
- Alert routing and escalation concepts

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry metrics semantic conventions for units: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html

## Issues Found
- The `http.server.request.duration` histogram used `unit="ms"` and recorded `duration_ms`, but the current OpenTelemetry HTTP semantic convention defines this metric in seconds (`s`). Changed the unit to `s`, renamed the argument to `duration_s`, and updated the checkout alert threshold from `500` to `0.5`.
- The HTTP metric attributes used older names (`http.method`, `http.status_code`). Updated them to the current stable semantic convention attributes `http.request.method` and `http.response.status_code`, and added the required `url.scheme` attribute for HTTP server metrics.
- The counter and gauge units used plural plain words (`errors`, `requests`, `items`). Updated them to UCUM annotation-style singular units (`{error}`, `{request}`, `{item}`) to match OpenTelemetry unit guidance.
- The asynchronous gauge callback referenced `metrics.Observation`. While valid through the imported module, the official Python examples import `Observation` directly from `opentelemetry.metrics`; updated the snippet to follow that documented pattern.
- The `multi_condition_alerts.py` snippet referenced `timedelta` and `AlertSeverity` without importing them. Added the missing imports.
- The `alert_router.py` snippet referenced `AlertSeverity` without importing it. Added the missing import.

## Review Notes
The Python code blocks are syntactically valid after the corrections. The examples still use placeholder application functions such as `get_queue_depth`, `classify_error`, and notification senders; that is acceptable for illustrative blog snippets, but a complete runnable sample would need implementations for those functions.
