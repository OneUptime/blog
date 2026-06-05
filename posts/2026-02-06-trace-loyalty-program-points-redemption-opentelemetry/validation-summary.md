# Validation Summary: How to Trace Loyalty Program Points Calculation and Redemption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry span attributes
- OpenTelemetry metric instruments
- Python

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry metrics semantic convention guidelines: https://opentelemetry.io/docs/specs/semconv/general/metrics/

## Issues Found
- The post described traces as providing a full audit trail. OpenTelemetry traces can be sampled and retained according to backend policy, so they should not be presented as a complete financial audit log. Updated the wording to describe diagnostic telemetry that complements the system of record and transactional audit logs.
- The examples recorded raw `member_id` values as span attributes. Loyalty member IDs may be sensitive user information, and OpenTelemetry guidance recommends deleting, hashing, or otherwise controlling sensitive attributes. Updated telemetry attributes to use `loyalty.member_hash` with `hash_member_id(...)`.
- The redemption latency histogram used the metric name `loyalty.redemption_latency_ms` with unit `ms`. OpenTelemetry metric guidance recommends not duplicating units in metric names when units are provided in metadata, and duration instruments should use seconds (`s`). Updated the metric to `loyalty.redemption.duration`, unit `s`, and recorded seconds.
- The elapsed-time measurement used `time.time()`, which is wall-clock time. Updated it to `time.perf_counter()` for duration measurement.

## Review Notes
The OpenTelemetry Python APIs used for `trace.get_tracer`, `metrics.get_meter`, `start_as_current_span`, `set_attribute`, `create_counter`, `Counter.add`, `create_histogram`, and `Histogram.record` match current official documentation. The snippets are illustrative and still depend on application-specific helper functions such as `load_member_profile`, `hash_member_id`, and `debit_points_atomic`.
