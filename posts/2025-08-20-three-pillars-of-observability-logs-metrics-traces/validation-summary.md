# Validation Summary: Logs, Metrics & Traces: Turning Three Noisy Streams into One Story

## Status
validated

## Post Type
Conceptual guide / educational explainer (with light technical references; no runnable code)

## Technologies Covered
- OpenTelemetry (OTel SDK, auto-instrumentation, semantic conventions)
- OpenTelemetry Collector (processors: batch, tail_sampling, transform, attributes, filter)
- W3C Trace Context / Baggage
- OpenMetrics, OpenAPI
- OneUptime (observability platform, OTLP ingestion, Terraform provider)
- General observability concepts: logs, metrics, traces, SLOs, sampling, cardinality

## Sources Consulted
- OpenTelemetry Collector processors documentation — https://opentelemetry.io/docs/collector/configuration/ and the opentelemetry-collector-contrib repo (batchprocessor, tailsamplingprocessor, transformprocessor, attributesprocessor, filterprocessor)
- OpenTelemetry semantic conventions registry (resource attributes `service.name`, `deployment.environment`, `cloud.region`; database attribute `db.system`) — https://opentelemetry.io/docs/specs/semconv/
- W3C Trace Context specification — https://www.w3.org/TR/trace-context/
- OpenMetrics — https://openmetrics.io/
- OneUptime documentation (OTLP-native ingestion, Terraform provider) — https://oneuptime.com/

## Issues Found
- **`db.system=postgres` → `db.system=postgresql`** (Putting It All Together flow, step 6): The canonical OpenTelemetry semantic-convention value for PostgreSQL under `db.system` is `postgresql`, not `postgres`. Since the post explicitly advocates following OTel semantic conventions, the illustrative example was corrected to use the canonical value.

## Review Notes
- This is primarily a narrative/conceptual post. The only fenced block is an ASCII data-flow diagram (`text`), not executable code, so there were no commands or config files to run.
- All referenced OTel Collector processor names (batch, tail_sampling, transform, attributes, filter) are real and current.
- Resource attribute names and the W3C trace context / baggage references are accurate.
- Conceptual claims (metrics for state/alerting, logs for detail, traces for causal path; cardinality cost dynamics; sampling and tiering strategies) are consistent with standard observability practice.
- Internal "Related Reading" links point to oneuptime.com blog posts; they were not individually fetched but follow the site's standard URL pattern and are plausible.
