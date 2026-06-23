# Validation Summary: Logs, Metrics & Traces: A Before and After Story.

## Status
validated

## Post Type
Narrative-driven conceptual guide (story-form best-practices piece on observability with OpenTelemetry and OneUptime).

## Technologies Covered
- OpenTelemetry (APIs, auto-instrumentation, semantic conventions)
- OpenTelemetry Collector (processors: batch, tail_sampling, attributes, transform, filter)
- OTLP (OpenTelemetry Protocol)
- W3C Trace Context propagation
- Distributed tracing, metrics, and structured logging (the three pillars)
- Trace/head/tail sampling strategies
- SLOs and burn-rate alerting
- Terraform (monitors/dashboards as code)
- OneUptime (OTLP ingestion, unified observability surface)

## Sources Consulted
- OpenTelemetry Collector processor docs — https://opentelemetry.io/docs/collector/configuration/ and contrib processors (batch, tail_sampling, attributes, transform, filter): https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor
- OpenTelemetry Semantic Conventions — https://opentelemetry.io/docs/specs/semconv/ (HTTP and database attributes such as `db.system`)
- W3C Trace Context specification — https://www.w3.org/TR/trace-context/
- OpenTelemetry sampling concepts (head vs tail sampling) — https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry logs / log correlation (trace_id & span_id) — https://opentelemetry.io/docs/specs/otel/logs/
- OTLP specification — https://opentelemetry.io/docs/specs/otlp/

## Issues Found
No technical issues found. All technical claims in the post are accurate:
- The named Collector processors (`batch`, `tail_sampling`, `attributes`, `transform`, `filter`) are all real and correctly described in their roles.
- Sampling model (head sampling baseline + tail sampling to retain errors/high-latency/rare routes) reflects standard OpenTelemetry practice.
- Injecting `trace_id`/`span_id` into structured logs for trace↔log correlation is correct.
- W3C Context Propagation is correctly cited as the mechanism for cross-service stitching.
- OTLP + Collector enabling routing/transform without code redeploys is accurate.
- Semantic convention examples (`http.method`, `db.system`) are valid attribute references.

## Review Notes
- The post is primarily a narrative/illustrative piece; numbers (MTTR figures, percentages, timelines) are story devices rather than measured benchmarks, which is appropriate for the format.
- Minor forward-looking note: in newer OpenTelemetry HTTP semantic conventions the `http.method` attribute was renamed to `http.request.method`. The post uses `http.method` purely as an illustrative example of a semantic convention attribute, so it is not incorrect, but a future edit could use `http.request.method` to reflect the current stable convention.
- `tail_sampling`, `transform`, and `filter` processors live in the Collector contrib distribution rather than the core distribution; this is an implementation detail not material to the post's claims.
