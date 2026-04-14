# Validation Summary: How to Set Up Dapr Observability with Jaeger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Jaeger (distributed tracing)
- OpenTelemetry Collector
- Kubernetes (deployment, services, annotations)
- Docker
- Zipkin protocol (compatibility layer)

## Sources Consulted
- Dapr official docs - Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr official docs - Setup tracing: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr official docs - Zipkin tracing: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr official docs - OTel Collector with Jaeger: https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector-jaeger/
- Dapr official docs - Annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr source code - span attribute constants: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/consts/consts.go
- Jaeger official docs - Getting started: https://www.jaegertracing.io/docs/
- Jaeger ports reference: https://github.com/jaegertracing/jaeger/blob/main/ports/ports.go
- OpenTelemetry blog - Jaeger exporter removal: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry blog - Jaeger native OTLP support: https://opentelemetry.io/blog/2022/jaeger-native-otlp/

## Issues Found

### 1. Outdated Jaeger all-in-one container ports (Kubernetes Deployment and Docker command)
**What was wrong:** The blog listed deprecated Jaeger Agent UDP ports (5775, 6831, 6832) and the agent config port (5778) that were removed when the jaeger-agent component was deprecated. The critical OTLP ports (4317 gRPC, 4318 HTTP) were missing entirely.
**What was changed:** Replaced the deprecated agent ports with the current recommended port set: 16686 (UI), 4317 (OTLP gRPC), 4318 (OTLP HTTP), 14250 (gRPC collector), 14268 (HTTP collector), 9411 (Zipkin). Applied to both the Kubernetes Deployment YAML and the local Docker run command.
**Why:** The jaeger-agent and its Thrift-based ports were deprecated in September 2023 and removed from the codebase. OTLP is now the primary ingestion protocol for Jaeger.

### 2. OpenTelemetry Collector `jaeger` exporter removed
**What was wrong:** The OTel Collector config used the `jaeger` exporter targeting port 14250. This exporter was removed from the OpenTelemetry Collector in v0.85.0 (September 2023). Any current OTel Collector version would fail to start with this config.
**What was changed:** Replaced `jaeger` exporter with `otlp/jaeger` exporter targeting Jaeger's native OTLP gRPC endpoint on port 4317 instead of the old Jaeger-native gRPC port 14250.
**Why:** Jaeger has natively supported OTLP since v1.35, making the dedicated Jaeger exporter unnecessary. The `otlp` exporter is the correct modern replacement.

### 3. Incorrect span attribute names in the Trace Span Attributes table
**What was wrong:** The table listed `dapr.app_id` and `dapr.target_app_id` which do not exist as Dapr span attributes. It also listed `http.method` (deprecated OTel semconv) and `http.status_code` (not a Dapr span attribute).
**What was changed:** Replaced with actual Dapr span attributes verified from source code: `dapr.protocol`, `dapr.status_code`, `http.request.method` (current OTel semantic convention), and `rpc.service`.
**Why:** The attribute names need to match what Dapr actually emits, as defined in `pkg/diagnostics/consts/consts.go`.

### 4. Incorrect claim about `samplingRate: "0"` delegating to Jaeger agent
**What was wrong:** The section "Production Sampling with Jaeger Agent" stated that setting `samplingRate: "0"` would "Let Jaeger agent decide" sampling. In reality, `samplingRate: "0"` disables tracing entirely in Dapr. The section also referenced `jaeger-agent` which is a deprecated component.
**What was changed:** Rewrote the section to use a practical 10% sampling rate example (`"0.1"`), corrected the endpoint to use an OTel Collector, and added a clear note that `"0"` disables tracing. Renamed section from "Production Sampling with Jaeger Agent" to "Production Sampling Configuration".
**Why:** The original advice would have silently disabled all tracing in production, the opposite of the intended effect.

## Review Notes
- The Jaeger Operator section (Option B) uses the `jaegertracing.io/v1` CRD which is specific to the Jaeger v1 Operator. Since Jaeger v1 reached end-of-life on December 31, 2025, the recommended production deployment method is now the OpenTelemetry Operator. This is not technically incorrect for users still on Jaeger v1, but may need updating in the future.
- The blog uses `jaegertracing/all-in-one:latest` which will pull Jaeger v2. The all-in-one image is appropriate for development but not production, which the blog correctly scopes.
- The Dapr Configuration `apiVersion: dapr.io/v1alpha1`, the `spec.tracing.zipkin.endpointAddress` format, the `spec.tracing.otel` fields, and all Kubernetes annotations are correct and current.
