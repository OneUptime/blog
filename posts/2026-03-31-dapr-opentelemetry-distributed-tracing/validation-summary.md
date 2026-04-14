# Validation Summary: How to Use Dapr with OpenTelemetry for Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Jaeger
- Zipkin
- Grafana Tempo
- Kubernetes (Deployments, Services, ConfigMaps)
- Python (Flask, OpenTelemetry SDK)
- Go (OpenTelemetry SDK)

## Sources Consulted
- Dapr official documentation: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Configuration resource spec (source code: `/pkg/config/configuration.go`)
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry blog - Jaeger exporter migration: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry blog - Jaeger native OTLP: https://opentelemetry.io/blog/2022/jaeger-native-otlp/
- OTel Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OTel Collector logging exporter removal: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Go OpenTelemetry SDK: https://pkg.go.dev/go.opentelemetry.io/otel
- Go attribute package: https://pkg.go.dev/go.opentelemetry.io/otel/attribute
- Python OpenTelemetry gRPC exporter: https://opentelemetry-python.readthedocs.io/

## Issues Found

### 1. Jaeger exporter removed from OTel Collector (Critical)
- **What was wrong:** The OTel Collector config used the `jaeger` exporter with endpoint `jaeger.default.svc.cluster.local:14250`. The `jaeger` exporter was deprecated in collector-contrib v0.72.0 and fully removed around v0.85.0. Port 14250 was the Jaeger-proprietary gRPC port.
- **What was changed:** Replaced `jaeger` exporter with `otlp/jaeger` exporter pointing to port 4317 (standard OTLP gRPC port), since Jaeger natively supports OTLP ingestion since v1.35.
- **Why:** Using the removed `jaeger` exporter would cause the Collector to fail to start. Modern Jaeger accepts traces via OTLP on port 4317.

### 2. `logging` exporter removed from OTel Collector (Critical)
- **What was wrong:** The config used `logging: verbosity: detailed`. The `logging` exporter was removed in collector v0.111.0 in favor of the `debug` exporter.
- **What was changed:** Replaced `logging` with `debug` exporter (same configuration options).
- **Why:** The `logging` exporter no longer exists in current Collector distributions.

### 3. Pipeline exporters list outdated
- **What was wrong:** The pipeline referenced `[jaeger, zipkin, otlp/tempo]`.
- **What was changed:** Updated to `[otlp/jaeger, zipkin, otlp/tempo]` to match the corrected exporter name.
- **Why:** Must reference the actual exporter name defined in the config.

### 4. Go code missing `attribute` import
- **What was wrong:** The Go code example used `attribute.String("order.id", ...)` but did not import `"go.opentelemetry.io/otel/attribute"`. This would cause a compile error.
- **What was changed:** Added `"go.opentelemetry.io/otel/attribute"` to the import block.
- **Why:** Without this import, the code will not compile.

### 5. Python gRPC exporter endpoint had incorrect scheme prefix
- **What was wrong:** `OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)` — the gRPC exporter expects a `host:port` format without the `http://` scheme prefix.
- **What was changed:** Changed to `endpoint="otel-collector:4317"`.
- **Why:** The gRPC exporter uses gRPC channels, not HTTP. While some implementations may strip the scheme, the correct format is `host:port`.

### 6. Architecture diagram label updated
- **What was wrong:** The Mermaid diagram showed "Jaeger exporter" as the label for the OTel Collector to Jaeger connection.
- **What was changed:** Updated to "OTLP exporter" to reflect the actual exporter type used.
- **Why:** Consistency with the corrected configuration that uses `otlp/jaeger` instead of the removed `jaeger` exporter.

## Review Notes
- The "Dapr v1.7 or later" prerequisite is plausible but could not be definitively confirmed from release notes. OTLP support was confirmed working in Dapr v1.8.x. The claim is kept as-is since it's a reasonable lower bound.
- The Dapr `isSecure` field defaults to `true` when omitted. The blog correctly sets it to `false` explicitly, which is important for non-TLS collector endpoints.
- The `debug` exporter is defined in the config but not included in the pipeline's exporters list. This matches the original post's intent (the `logging` exporter was also not in the pipeline). If the author wants debug output, it should be added to the pipeline.
- All other Dapr configuration fields (`samplingRate`, `otel.endpointAddress`, `otel.protocol`), Kubernetes manifests, Python OTel SDK usage, and Go OTel SDK usage are correct and current.
