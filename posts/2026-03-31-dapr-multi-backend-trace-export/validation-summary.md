# Validation Summary: How to Configure Multi-Backend Trace Export for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar tracing configuration)
- OpenTelemetry Collector (receivers, processors, exporters, pipelines)
- Jaeger (trace backend)
- Grafana Tempo (trace backend)
- Honeycomb (trace backend)
- Kubernetes (ConfigMap, Secrets, Deployments)

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector contrib exporters (Jaeger exporter deprecation): https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter
- Jaeger OTLP support documentation: https://www.jaegertracing.io/docs/latest/apis/#opentelemetry-protocol-stable
- Dapr observability/tracing configuration: https://docs.dapr.io/operations/observability/tracing/otel-collector/
- OpenTelemetry Collector tail_sampling processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector health_check extension: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- Honeycomb OpenTelemetry documentation: https://docs.honeycomb.io/send-data/opentelemetry/

## Issues Found

### 1. Deprecated `jaeger` exporter replaced with `otlp/jaeger`
**What was wrong:** The post used the standalone `jaeger` exporter with endpoint `jaeger.monitoring:14250` (the legacy Jaeger gRPC model port). The `jaeger` exporter was deprecated and removed from the OpenTelemetry Collector as of v0.86.0 (October 2023). Modern Jaeger (v1.35+) supports OTLP natively.
**What was changed:** Replaced `jaeger` exporter with `otlp/jaeger` using endpoint `jaeger.monitoring:4317` (standard OTLP gRPC port). Updated all pipeline references from `jaeger` to `otlp/jaeger`.
**Why:** The old exporter no longer exists in current OTel Collector distributions. Using `otlp/jaeger` is the correct modern approach.

### 2. Undefined `filter_sampling` processor replaced with `tail_sampling`
**What was wrong:** The "Separate Pipelines per Backend" section referenced a `filter_sampling` processor in the `traces/analysis` pipeline, but this processor does not exist in any OpenTelemetry Collector distribution (core or contrib) and was not defined in the processors section.
**What was changed:** Replaced `filter_sampling` with `tail_sampling`, which is already defined in the processors section of the earlier configuration example.
**Why:** `filter_sampling` is not a valid OTel Collector processor name. `tail_sampling` is the appropriate processor for the described use case.

### 3. Secret key name mismatch with environment variable reference
**What was wrong:** The `kubectl create secret` command created a secret with key `honeycomb-key`, but the collector configuration referenced `${HONEYCOMB_API_KEY}`. When mounted via `kubectl set env --from=secret/...`, the environment variable name matches the secret key, so the variable would be `honeycomb-key`, not `HONEYCOMB_API_KEY`.
**What was changed:** Changed the secret key from `honeycomb-key` to `HONEYCOMB_API_KEY` in the `kubectl create secret` command.
**Why:** The secret key name must match the environment variable name referenced in the collector config for variable substitution to work.

## Review Notes
- The `tail_sampling` processor is only available in the OpenTelemetry Collector Contrib distribution (`otelcol-contrib`), not the core distribution. The post doesn't mention this requirement, which could cause confusion for users running the core collector. A future revision could note this.
- The Honeycomb `x-honeycomb-dataset` header is used for Honeycomb Classic environments. In newer Honeycomb Environments, the dataset is determined by the service name in the trace data. This is still valid but may warrant a note in future updates.
- The `health_check` extension response format from the curl command may vary across collector versions. The `jq '.status'` command assumes a specific JSON structure that may differ.
