# Validation Summary: How to Export Dapr Traces to Multiple Backends Simultaneously

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar tracing configuration)
- OpenTelemetry Collector (contrib distribution, v0.96.0)
- Zipkin (trace backend)
- Jaeger (trace backend, OTLP ingestion)
- Grafana Tempo (trace backend)
- Kubernetes (Deployments, Services, ConfigMaps)

## Sources Consulted
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- OpenTelemetry Collector contrib v0.86.0 release notes (Jaeger exporter removal): https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.86.0
- OTel blog on Jaeger exporter migration: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OTel Collector logging-to-debug exporter migration: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Jaeger deployment docs (OTLP support): https://www.jaegertracing.io/docs/1.76/deployment/

## Issues Found

### 1. Jaeger exporter not available in Collector v0.96.0
- **What was wrong:** The post used the `jaeger` exporter with endpoint `jaeger-collector.monitoring:14250` (native Jaeger gRPC protocol). The `jaeger` exporter was deprecated in Collector v0.72.0 and removed in v0.86.0. Since the post specifies image version 0.96.0, this exporter does not exist and the Collector would fail to start.
- **What was changed:** Replaced `jaeger` exporter with `otlp/jaeger` exporter pointing to `jaeger-collector.monitoring:4317` (Jaeger's native OTLP gRPC endpoint). Also updated the pipeline and the "Adding a Third Backend" example to reference `otlp/jaeger`.
- **Why:** Jaeger has supported OTLP ingestion natively since v1.35, and the OTel Collector removed the dedicated Jaeger exporter in favor of the standard OTLP exporter.

### 2. Logging exporter deprecated, loglevel field invalid
- **What was wrong:** The post used the `logging` exporter with `loglevel: debug`. The `logging` exporter was deprecated in v0.86.0 in favor of the `debug` exporter, and the `loglevel` config field was deprecated even earlier in favor of `verbosity`.
- **What was changed:** Replaced `logging` exporter with `debug` exporter, and `loglevel: debug` with `verbosity: detailed`. Updated the pipeline to reference `debug`.
- **Why:** Using the deprecated exporter and field would produce warnings in v0.96.0 and would fail entirely in v0.111.0+ where the `logging` exporter was fully removed.

## Review Notes
- The Dapr Configuration resource (Step 1) is correct: `endpointAddress`, `isSecure`, and `protocol` are all valid field names per the current Dapr docs, and `apiVersion: dapr.io/v1alpha1` remains current.
- The Collector image version (0.96.0) is from March 2024. Readers may want to use a more recent version, but the config as corrected is valid for this version.
- The Kubernetes manifests (Deployment, Service, ConfigMap) are syntactically correct and follow standard patterns.
- The architectural approach (Dapr -> OTel Collector -> multiple backends) is the officially recommended pattern from both Dapr and OpenTelemetry documentation.
