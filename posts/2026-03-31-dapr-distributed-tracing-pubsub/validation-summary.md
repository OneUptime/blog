# Validation Summary: How to Implement Distributed Tracing for Pub/Sub Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, tracing configuration)
- OpenTelemetry Python SDK (trace API, context propagation)
- CloudEvents specification
- W3C Trace Context (traceparent, tracestate)
- Grafana Tempo (TraceQL queries)
- httpx (async HTTP client for Python)
- OTLP HTTP protocol

## Sources Consulted
- Dapr Configuration spec for tracing/OTEL exporter: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- OpenTelemetry Python SDK trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- CloudEvents specification v1.0: https://github.com/cloudevents/spec/blob/v1.0/spec.md
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/

## Issues Found
1. **Incorrect `endpointAddress` format in Dapr tracing configuration**: The `endpointAddress` field was set to `"http://tempo.monitoring.svc.cluster.local:4318/v1/traces"` which includes a URL scheme (`http://`) and path (`/v1/traces`). Dapr's OTEL exporter expects a bare `host:port` format and constructs the full URL internally based on the `protocol` field. Fixed to `"tempo.monitoring.svc.cluster.local:4318"`.

## Review Notes
- The claim that "Dapr 1.11+ supports automatic W3C trace context injection in CloudEvents" is technically true but potentially misleading, as Dapr has supported W3C trace context propagation in CloudEvents since much earlier versions (around 1.0). The feature is not new to 1.11. This is not incorrect per se, but readers may misinterpret it as meaning the feature was introduced in 1.11.
- The Python code examples use correct and current OpenTelemetry Python SDK APIs (`trace.get_tracer()`, `inject()`, `extract()`, `start_as_current_span()`, `SpanKind.CONSUMER`).
- The CloudEvents structure is valid per the spec, with proper required fields (`specversion`, `type`, `source`, `id`) and the `traceparent`/`tracestate` extensions for trace propagation.
- The Dapr pub/sub HTTP API URL format (`/v1.0/publish/{pubsub-name}/{topic}`) is correct.
- The TraceQL query syntax is valid, including the regex operator (`=~`), span attribute access (`span.order.id`), and duration filter (`duration > 5s`).
- The subscriber correctly returns `{"status": "SUCCESS"}` which is the expected response format for Dapr pub/sub subscribers.
