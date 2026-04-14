# Validation Summary: How to Send Dapr Traces to Instana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime) — tracing configuration
- IBM Instana — observability platform and agent
- OpenTelemetry Collector — trace pipeline
- Kubernetes — Helm chart deployment, ConfigMaps, annotations
- OTLP (OpenTelemetry Protocol) — gRPC exporter

## Sources Consulted
- Instana Helm chart values.yaml and README — https://github.com/instana/helm-charts/blob/main/instana-agent/README.md
- Instana agent Kubernetes deployment manifest — https://github.com/instana/agent-k8s-deployment/blob/main/instana-agent.yaml
- Dapr Configuration schema reference — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr OpenTelemetry Collector tracing how-to — https://docs.dapr.io/operations/observability/tracing/otel-collector/
- Dapr annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- OpenTelemetry Collector OTLP receiver documentation — https://github.com/open-telemetry/opentelemetry-collector/tree/main/receiver/otlpreceiver
- OpenTelemetry Collector resource processor documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourceprocessor
- OpenTelemetry Collector OTLP exporter documentation — https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- OpenTelemetry Collector batch processor documentation — https://github.com/open-telemetry/opentelemetry-collector/tree/main/processor/batchprocessor

## Issues Found

1. **Incorrect Dapr sidecar annotation name (`dapr.io/sidecar-env-vars`)**: The annotation `dapr.io/sidecar-env-vars` does not exist in Dapr's documentation. The correct annotation for injecting environment variables into the Dapr sidecar is `dapr.io/env`. Changed to `dapr.io/env`. Additionally, the original value `OTEL_RESOURCE_ATTRIBUTES=service.name=catalog-service,service.version=1.0.0` contained a comma inside the env var value, which conflicts with Dapr's use of commas as separators between multiple env var entries. Simplified to `OTEL_RESOURCE_ATTRIBUTES=service.name=catalog-service` to avoid ambiguous parsing.

2. **Incorrect Instana agent status endpoint path**: The blog used `http://localhost:42699/com.instana.agent.main/status` but the documented Instana agent health/status endpoint is simply `http://localhost:42699/status`. Port 42699 is correct. Changed the path to `/status`.

## Review Notes

- The Helm value `opentelemetry.enabled=true` is a legacy setting in the Instana agent chart. Since the post also sets `opentelemetry.grpc.enabled=true` (the current preferred setting), the legacy flag is redundant but not harmful. Left as-is for clarity.
- The resource processor attribute `com.instana.plugin.generic.trace.service` follows Instana's internal naming convention but could not be verified against official documentation as a recognized resource attribute. Instana natively reads the standard OpenTelemetry `service.name` resource attribute, so this processor block may be unnecessary. Left as-is since the OTel Collector configuration syntax is valid and it does not cause errors.
- The `opentelemetry.grpc.enabled` Helm value defaults to `true` in recent chart versions, so explicitly setting it is redundant but good for documentation clarity.
- The "Correlation with Infrastructure Monitoring" section mentions ensuring the `host.id` attribute is set but does not show how to set it — it only shows a command to check agent status. This is a minor content gap but not a technical error.
