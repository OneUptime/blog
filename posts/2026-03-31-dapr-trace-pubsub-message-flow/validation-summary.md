# Validation Summary: How to Trace Pub/Sub Message Flow in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Dapr Pub/Sub building block
- Dapr distributed tracing with OpenTelemetry
- Dapr CloudEvents integration
- W3C Trace Context (traceparent)
- Jaeger (trace visualization)
- Python / Flask
- Kafka (as pub/sub broker)

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Setup tracing: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr CloudEvents in pub/sub: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr W3C trace context overview: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Jaeger source code (query_parser.go, http_handler.go) from jaegertracing/jaeger GitHub repository

## Issues Found
1. **Jaeger API path `/api/v2/traces` does not exist.** The blog used `http://localhost:16686/api/v2/traces` in the curl examples. Jaeger has no `/api/v2/` REST endpoint — the correct search endpoint is `/api/traces` (unversioned). Changed both curl commands to use `/api/traces`.

2. **Jaeger tags query parameter format incorrect.** The blog used `tags=error:true` (plural `tags` with key:value format). With the plural `tags` parameter, Jaeger expects a JSON-encoded map (e.g., `tags={"error":"true"}`). For the simpler `key:value` format, the singular `tag` parameter must be used. Changed `tags=error:true` to `tag=error:true`.

## Review Notes
- The Dapr Subscription YAML uses `apiVersion: dapr.io/v1alpha1`, which is still supported but has a newer `v2alpha1` alternative with CEL-based routing rules. The v1alpha1 format remains valid and is appropriate for a general guide.
- The subscriber code does not include a `/dapr/subscribe` programmatic subscription endpoint, which is fine since the post uses declarative subscription YAML shown in the DLQ section.
- The `extract_trace_id` function correctly parses the W3C traceparent format (`version-trace_id-parent_id-trace_flags`) by extracting `parts[1]` as the trace ID.
- All Dapr configuration (tracing config, publish API URL, subscription spec, deadLetterTopic field) verified correct against official documentation.
