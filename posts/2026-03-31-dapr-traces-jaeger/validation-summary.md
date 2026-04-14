# Validation Summary: How to Send Dapr Traces to Jaeger

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Jaeger (distributed tracing platform)
- OpenTelemetry Collector
- Kubernetes (Deployments, Services, port-forwarding)
- Helm (Jaeger Helm chart)
- Zipkin protocol (Zipkin-compatible endpoint on Jaeger)
- Elasticsearch (production storage backend for Jaeger)

## Sources Consulted
- Jaeger Getting Started documentation (v1.53): https://www.jaegertracing.io/docs/1.53/getting-started/
- Jaeger Deployment guide: https://www.jaegertracing.io/docs/1.53/deployment/
- Dapr observability / tracing configuration docs: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr OTel Collector with Jaeger: https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector-jaeger/
- OpenTelemetry blog on migrating from the Jaeger exporter: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector OTLP exporter docs: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- Jaeger Helm chart repository: https://jaegertracing.github.io/helm-charts

## Issues Found

### 1. OTel Collector exporter pointed to wrong Jaeger port (protocol mismatch)
- **What was wrong:** The OTel Collector config used an `otlp` type exporter (`otlp/jaeger`) targeting `jaeger.monitoring.svc.cluster.local:14250`. Port 14250 is Jaeger's native gRPC collector port (speaking `model.proto`), not OTLP. The `otlp` exporter sends OTLP protocol, which Jaeger accepts on port 4317 (gRPC). This mismatch would cause a connection/protocol error at runtime.
- **What was changed:** Updated the exporter endpoint from port `14250` to port `4317`.
- **Why:** Since Jaeger 1.35+, OTLP is accepted natively on port 4317 (gRPC) and 4318 (HTTP). The legacy `jaeger` exporter (which spoke to port 14250) was removed from the OTel Collector in v0.86.0. The correct approach for modern Jaeger is to use the `otlp` exporter targeting port 4317.

### 2. Jaeger Deployment and Service missing OTLP port
- **What was wrong:** The Jaeger Deployment's `containerPort` list and the Service definition did not include port 4317 for OTLP gRPC ingestion. While the blog recommends the OTel Collector approach, the Jaeger service would not route traffic on port 4317 without this entry.
- **What was changed:** Added `containerPort: 4317` (labeled "OTLP gRPC") to the Deployment and a corresponding service port entry (`otlp-grpc: 4317`) to the Service.
- **Why:** The OTel Collector config references `jaeger.monitoring.svc.cluster.local:4317`, so the Jaeger Service must expose that port for the connection to succeed.

## Review Notes
- The Jaeger all-in-one image version 1.53 is valid but not the latest. Jaeger v2 (based on the OpenTelemetry Collector architecture) has been released. The post's approach is still correct for Jaeger v1.x but readers should be aware that Jaeger v2 changes the deployment model significantly.
- The Helm chart values (`provisionDataStore.cassandra`, `storage.type`, etc.) are correct for the `jaegertracing/jaeger` Helm chart.
- The Dapr Configuration resources (both Zipkin and OTel variants) use correct field names and API version (`dapr.io/v1alpha1`).
- The Zipkin endpoint path `/api/v2/spans` is correct for Jaeger's Zipkin-compatible collector.
- The Jaeger query API path `/api/traces` with `service` and `limit` query parameters is correct.
