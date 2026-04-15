# Validation Summary: How to Set Up End-to-End Tracing for Dapr Microservices

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Dapr (sidecar architecture, Configuration CRD, service invocation, state management, pub/sub)
- OpenTelemetry (tracing, context propagation, OTel Collector)
- NGINX Ingress Controller (OpenTelemetry integration)
- Jaeger (distributed trace backend)
- Python / Flask (API gateway and service code)
- Kubernetes (Ingress resource, pod annotations)
- Redis (state store)
- Kafka (pub/sub)

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Configuration Spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr W3C Trace Context: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr State Management API: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API: https://docs.dapr.io/reference/api/pubsub_api/
- OpenTelemetry Collector Jaeger exporter deprecation (removed in v0.86.0, September 2023)
- NGINX Ingress Controller OpenTelemetry annotations documentation

## Issues Found

1. **Architecture diagram code fence language**: The ASCII architecture diagram used ` ```json ` as the code fence language, but the content is plain text, not JSON. Changed to ` ```text `.

2. **Deprecated Jaeger exporter in OTel Collector config**: The `jaeger` exporter was removed from the OpenTelemetry Collector in v0.86.0 (September 2023). The config used `jaeger` exporter with endpoint port 14250 (Jaeger's legacy native gRPC port). Replaced with `otlp/jaeger` exporter targeting port 4317 (Jaeger's OTLP gRPC endpoint), which is the recommended approach since Jaeger v1.35+ supports OTLP natively.

3. **Incorrect trace header reference**: The verification section referenced extracting `X-Trace-Id` from a response header. Dapr uses the W3C `traceparent` header standard — there is no `X-Trace-Id` header. Updated the comment to reference the `traceparent` response header instead.

## Review Notes
- The Dapr Configuration CRD fields (`spec.tracing.otel.endpointAddress`, `isSecure`, `protocol: grpc`) are all correct per current Dapr documentation.
- The Dapr HTTP API URLs for service invocation, state management, and pub/sub are all correct.
- The Python OpenTelemetry instrumentation code (tracer creation, span attributes, context injection) follows correct API usage.
- The downstream service code manually passes the `traceparent` header to the Dapr sidecar. While Dapr's sidecar handles trace propagation automatically for service-to-service calls, explicitly passing the header for state and pub/sub operations is a reasonable practice to ensure trace continuity.
- The NGINX Ingress annotations for OpenTelemetry (`enable-opentelemetry`, `opentelemetry-trust-incoming-span`) are valid for the NGINX Ingress Controller with OpenTelemetry module enabled.
