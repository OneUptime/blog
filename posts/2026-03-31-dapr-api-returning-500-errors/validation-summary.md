# Validation Summary: How to Fix Dapr API Returning 500 Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (kubectl commands)
- Redis (component backend example)
- Apache Kafka (component backend example)
- OpenTelemetry / Zipkin (distributed tracing)
- Python / Flask (application handler example)

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr tracing configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr pub/sub subscriber guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr source code error codes: pkg/messages/errorcodes/errorcodes.go

## Issues Found
1. **Incorrect error code `ERR_STATE_SET`**: The post listed `ERR_STATE_SET` as the error code for state save failures. The actual Dapr error code is `ERR_STATE_SAVE`. Fixed on line 27.
2. **Incorrect error code `ERR_PUBLISH_MESSAGE`**: The post listed `ERR_PUBLISH_MESSAGE` as the error code for pub/sub publish failures. The actual Dapr error code is `ERR_PUBSUB_PUBLISH_MESSAGE`. Fixed on line 28.

## Review Notes
- The tracing configuration uses the Zipkin exporter format, which is still valid but Dapr now also supports and recommends the OpenTelemetry Collector (`spec.tracing.otel`) as the preferred modern approach. This is not an error but could be updated in the future.
- All HTTP API endpoints, annotation names, default ports, kubectl commands, and Python handler examples are accurate.
- The claim that Dapr retries message delivery when a subscriber returns HTTP 500 is correct per official documentation.
