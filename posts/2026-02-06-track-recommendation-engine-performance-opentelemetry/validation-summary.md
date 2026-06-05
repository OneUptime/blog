# Validation Summary: How to Track Recommendation Engine Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python async service instrumentation
- Recommendation engines / collaborative filtering
- E-commerce observability metrics

## Sources Consulted
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry handling sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- Python time module documentation for `time.perf_counter()`: https://docs.python.org/3/library/time.html#time.perf_counter
- McKinsey article containing the Amazon recommendation statistic: https://www.mckinsey.com/industries/retail/our-insights/how-retailers-can-keep-up-with-consumers

## Issues Found
- The sample used `time.time()` to measure latency. Changed elapsed-time measurements to `time.perf_counter()`, which is the appropriate Python timer for short performance intervals.
- The sample added raw `user_id` to span attributes. Changed this to `reco.user_hash` via `hash_user_id(user_id)` to align with OpenTelemetry guidance to avoid collecting personal information unless necessary and to prefer hashing or minimizing user identifiers.
- The sample computed `len(history)` directly and later used `history.user_vector` even on cold-start requests. Added `history_count = len(history) if history else 0` and made cold-start scoring use a popularity fallback score so the example does not dereference a missing user vector.
- The scoring span originally recorded model latency for the full scoring block, including embedding fetch time. Split scoring duration from actual model inference timing so `reco.model.latency_ms` measures the model inference block specifically.

## Review Notes
The OpenTelemetry Python API usage in the post is current: `trace.get_tracer`, `metrics.get_meter`, `tracer.start_as_current_span`, `span.set_attribute`, `meter.create_histogram`, `meter.create_counter`, histogram `record`, and counter `add` are valid APIs. Metric names with custom `reco.*` attributes are acceptable for domain-specific telemetry, though production systems should continue to watch attribute cardinality and backend cost.
