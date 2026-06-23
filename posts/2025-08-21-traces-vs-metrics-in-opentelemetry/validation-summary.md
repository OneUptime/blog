# Validation Summary: Traces vs Metrics in Software Observability

## Status
validated

## Post Type
Conceptual guide / explainer (the three pillars of observability — metrics, traces, logs — framed within the OpenTelemetry mental model)

## Technologies Covered
- OpenTelemetry (signals: metrics, traces, logs)
- Distributed tracing concepts (spans, parent/child span relationships, trace correlation)
- Metric instrument types (counter, histogram)
- Structured logging (JSON / `jsonc`) with trace/span correlation

## Sources Consulted
- OpenTelemetry — Signals overview (Traces, Metrics, Logs): https://opentelemetry.io/docs/concepts/signals/
- OpenTelemetry — Traces / spans concepts: https://opentelemetry.io/docs/concepts/signals/traces/
- OpenTelemetry — Metrics concepts (counter, histogram instruments): https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry — Logs and log/trace correlation (trace_id, span_id): https://opentelemetry.io/docs/concepts/signals/logs/
- OpenTelemetry — Trace context / IDs: https://opentelemetry.io/docs/specs/otel/trace/api/
- ISO 8601 date-time format reference

## Issues Found
1. **Inaccurate "Notes" bullet under the trace example** — The original text read: "Mixed parallel (auth, cart, inventory, pricing) and nested spans (DB + external calls) illustrate depth." None of `cart`, `inventory`, `pricing`, or a `DB` span appear in either the trace table or the accompanying `trace.svg` (verified the SVG contains only `auth-service`, `payment-service`, and `order-service`). This was a leftover/template description that did not match the actual example. Changed to: "Nested spans (payment-service's retried POST /psp/charge external calls) illustrate depth." — which accurately describes the example shown.
2. **Contradictory definition of logs** — Logs were defined as "**unstructured text records**", yet the entire Logs section and its example demonstrate and recommend a *structured* JSON log with queryable fields and trace correlation. This is also at odds with modern OpenTelemetry logging guidance (structured logs with `trace_id`/`span_id`). Changed the descriptor to "**timestamped event records**", which is accurate and consistent with the structured-logging example that follows.

## Review Notes
- The trace table is internally consistent: every span's `Duration` equals `End Time − Start Time`, and the parent/child span relationships are valid (root children point to `root0001`; the two `POST /psp/charge` external-call spans correctly nest under the `process-payment` span `q7r8s9t0`).
- The structured log JSON is valid `jsonc` (comments allowed), uses a valid ISO 8601 timestamp, and demonstrates correct OTel-style `trace_id` / `span_id` correlation fields.
- Metric names (`http_request_duration_seconds`, `http_request_count`) and instrument types (histogram, counter) are illustrative Prometheus-style names rather than exact OpenTelemetry semantic-convention names (current OTel convention would be `http.server.request.duration`). This is acceptable for a conceptual post and was left as-is; a future refresh could align these with the OTel HTTP semantic conventions.
- Trace and span IDs in the example are shortened/illustrative rather than full-length hex IDs (real OTel trace IDs are 16 bytes / span IDs 8 bytes). Acceptable for an explainer; no change made.
