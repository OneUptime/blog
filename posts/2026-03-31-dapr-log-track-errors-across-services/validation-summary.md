# Validation Summary: How to Log and Track Errors Across Dapr Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Python (Flask)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Dapr pub/sub building block
- Dapr state management building block
- Dapr distributed tracing (W3C Trace Context, Zipkin format)
- Jaeger (as Zipkin-compatible collector)
- Grafana Loki (LogQL queries)
- AWS CloudWatch Insights

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Zipkin tracing setup: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr W3C trace context: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Dapr Python SDK client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr state management how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr pub/sub building block: https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Jaeger APIs (Zipkin compatibility): https://www.jaegertracing.io/docs/architecture/apis/
- Dapr Python SDK GitHub examples: https://github.com/dapr/python-sdk

## Issues Found
No technical issues found.

## Review Notes
- The Dapr Configuration resource uses `apiVersion: dapr.io/v1alpha1` and the `spec.tracing.samplingRate` / `spec.tracing.zipkin.endpointAddress` structure, all verified correct.
- The Dapr Python SDK method signatures for `publish_event` (with `pubsub_name`, `topic_name`, `data`, `data_content_type`), `get_state` (with `store_name`, `key`, returning `.data`), and `save_state` (with `store_name`, `key`, `value`) are all accurate.
- Dapr does automatically propagate W3C `traceparent` headers for HTTP-based service invocation, and reading them from `request.headers` is the correct approach (no SDK helper methods exist for this).
- The `dapr-app-id` header is correctly identified as a header used in Dapr service-to-service invocation.
- Jaeger supports Zipkin-compatible ingestion on port 9411 at `/api/v2/spans`, making the tracing configuration valid.
- The pub/sub subscriber endpoint correctly accesses the inner data via `request.get_json().get("data", {})`, which matches Dapr's CloudEvent envelope delivery format.
- The Loki LogQL and CloudWatch Insights query syntax are both correct.
- The example `traceparent` value in the Loki query (`00-abc123-01`) is a simplified placeholder rather than a full W3C traceparent format (`00-{trace-id}-{span-id}-{flags}`), but this is acceptable as an illustrative example.
