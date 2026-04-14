# Validation Summary: How to Implement Trace Context Propagation in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar-based microservice runtime)
- OpenTelemetry SDK (Python)
- W3C TraceContext specification
- OpenTelemetry Collector
- Jaeger (distributed tracing backend)
- Zipkin (alternative tracing backend)
- Flask (Python web framework)
- Kubernetes (deployment manifests)
- CloudEvents specification

## Sources Consulted
- Dapr Configuration Schema Reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Tracing Setup Documentation: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Pub/Sub CloudEvents: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr OpenTelemetry Collector to Jaeger: https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector-jaeger/
- OpenTelemetry Jaeger Exporter Migration Guide: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector Contrib Changelog (Jaeger exporter removal at v0.85.0)
- W3C TraceContext Specification: https://www.w3.org/TR/trace-context/

## Issues Found

### 1. CloudEvent extension field name: `traceid` changed to `traceparent`
- **What was wrong:** The CloudEvent JSON example used `traceid` as the extension attribute name for the W3C trace context value (`00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`). Dapr uses `traceparent` as the CloudEvent extension attribute name, matching the W3C TraceContext header name. The value shown is in W3C traceparent format (version-traceid-parentid-traceflags), not a bare trace ID.
- **What was changed:** Renamed `traceid` to `traceparent` in the CloudEvent JSON example.
- **Why:** The field name must match what Dapr actually injects into CloudEvents, which is the standard `traceparent` extension attribute.

### 2. Jaeger native exporter replaced with OTLP exporter
- **What was wrong:** The OpenTelemetry Collector config used the native `jaeger` exporter with endpoint `jaeger:14250` (gRPC Thrift). This exporter was removed from the OpenTelemetry Collector in v0.85.0, and the post specifies Collector image version 0.92.0.
- **What was changed:** Replaced the `jaeger` exporter with `otlp/jaeger` exporter targeting `jaeger:4317` (Jaeger's native OTLP endpoint). Updated the pipeline to reference `otlp/jaeger` instead of `jaeger`.
- **Why:** Modern Jaeger (v2+) natively accepts OTLP on port 4317. The OTLP exporter is included in the base OTel Collector distribution and is the recommended path for sending traces to Jaeger.

### 3. Deprecated `logging` exporter replaced with `debug` exporter
- **What was wrong:** The config used `logging` exporter with `loglevel: info`. The `logging` exporter was deprecated in favor of the `debug` exporter, and the `loglevel` field was replaced by `verbosity`.
- **What was changed:** Replaced `logging` with `debug` exporter using `verbosity: basic`. Updated the pipeline reference accordingly.
- **Why:** Using current, non-deprecated configuration ensures the collector config works with OTel Collector v0.92.0 without deprecation warnings.

## Review Notes
- The Dapr Configuration YAML structure (`spec.tracing.otel` with `endpointAddress`, `isSecure`, `protocol`) and the Zipkin alternative config are both correct per Dapr docs.
- The `spec.metric.enabled: true` field is correctly placed as a sibling of `tracing` under `spec`.
- The Python OpenTelemetry code correctly extracts `traceparent`/`tracestate` headers, uses `TraceContextTextMapPropagator` for extraction, and creates proper child spans. The `inject()` call for propagating context on outgoing Dapr state store calls is correct.
- The Dapr pub/sub publish endpoint format (`/v1.0/publish/<pubsubname>/<topic>`) is correct.
- The pub/sub publisher code correctly constructs a CloudEvent with `Content-Type: application/cloudevents+json` and injects trace context as extensions.
- The Jaeger deployment URL points to the jaeger-operator examples repo, which is a reasonable reference but may change over time.
