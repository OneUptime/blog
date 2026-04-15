# Validation Summary: How to Correlate Logs with Traces in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, distributed tracing)
- W3C TraceContext (traceparent header format)
- OpenTelemetry (Go, Python, Node.js SDKs)
- Go (zerolog structured logging)
- Python (structlog structured logging)
- Node.js (pino structured logging)
- Grafana (Loki + Tempo derived fields)
- Elasticsearch / Kibana (term queries, dashboard linking)
- Jaeger / Zipkin (trace visualization)
- kubectl / jq (sidecar log filtering)

## Sources Consulted
- W3C Trace Context specification (https://www.w3.org/TR/trace-context/) — verified traceparent header format: version (2 hex), trace-id (32 hex), parent-id (16 hex), trace-flags (2 hex)
- OpenTelemetry Go SDK API — verified `trace.SpanFromContext()`, `SpanContext().TraceID().String()`, `SpanContext().SpanID().String()`
- OpenTelemetry Python SDK API — verified `trace.get_current_span()`, `span.get_span_context()`, `format(ctx.trace_id, '032x')`, `format(ctx.span_id, '016x')`
- OpenTelemetry JavaScript SDK API (`@opentelemetry/api`) — verified `trace.getActiveSpan()`, `span.spanContext()`, `ctx.traceId`, `ctx.spanId`
- Dapr documentation on distributed tracing — confirmed W3C TraceContext propagation for service invocation and pub/sub
- Grafana Loki documentation on derived fields — confirmed datasourceUid + matcherRegex pattern for Tempo linking
- Dapr sidecar documentation — confirmed container name is `daprd`

## Issues Found
No technical issues found.

## Review Notes
- The blog labels the third field of the `traceparent` header as "span-id". The W3C TraceContext spec formally names this field "parent-id", though it does contain a span ID value. This is common usage in the OpenTelemetry community and not incorrect, but worth noting for precision.
- The Grafana derived fields regex `[a-f0-9]{32}` only matches lowercase hex characters. This is fine in practice since OpenTelemetry SDKs produce lowercase hex trace IDs, but if logs from non-OTel sources could contain uppercase hex, the regex would need `[a-fA-F0-9]{32}`.
- The Go example assumes OTel SDK initialization and trace-context-extracting middleware are already configured — this is a reasonable assumption for a focused tutorial but readers new to OTel may need additional setup guidance.
- The Dapr sidecar log field name for trace ID may vary across Dapr versions (e.g., `traceid` vs `traceId`). The `jq` example uses `traceId` (camelCase), which should be verified against the specific Dapr version in use.
