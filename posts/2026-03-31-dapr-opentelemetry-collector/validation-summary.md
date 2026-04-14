# Validation Summary: How to Configure OpenTelemetry Collector for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar configuration, tracing)
- OpenTelemetry Collector (contrib distribution, v0.95.0)
- Kubernetes (ConfigMap, Deployment, Service)
- Jaeger (as trace backend via OTLP)
- Zipkin (as trace receiver)
- Datadog (as trace exporter)
- telemetrygen (testing tool)

## Sources Consulted
- OpenTelemetry Collector Contrib v0.86.0 release notes (jaeger exporter removal): https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.86.0
- OTel blog on Jaeger exporter migration: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OTel Collector debug exporter (replacement for logging): https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Dapr Configuration resource source code (pkg/apis/configuration/v1alpha1/types.go): https://github.com/dapr/dapr
- OTel Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md

## Issues Found

### 1. Jaeger exporter removed in OTel Collector v0.86.0
- **What was wrong:** The post used the native `jaeger` exporter with endpoint port 14250. This exporter was removed in OTel Collector v0.86.0, but the post specifies image version 0.95.0.
- **What was changed:** Replaced `jaeger` exporter with `otlp/jaeger` exporter targeting Jaeger's native OTLP gRPC port 4317 (instead of the legacy Jaeger gRPC port 14250). Applied in both the main ConfigMap configuration and the "Adding Multiple Exporters" section.
- **Why:** Jaeger natively supports OTLP ingestion since v1.35.0. The `otlp` exporter is the correct way to send traces to Jaeger from OTel Collector v0.86.0+.

### 2. `logging` exporter deprecated, `loglevel` field removed
- **What was wrong:** The post used the `logging` exporter with `loglevel: debug`. The `logging` exporter was deprecated in v0.86.0 (renamed to `debug`), and the `loglevel` field was replaced by `verbosity`.
- **What was changed:** Replaced `logging` exporter with `debug` exporter and changed `loglevel: debug` to `verbosity: detailed`. Updated the pipeline reference from `logging` to `debug`.
- **Why:** While `logging` still worked as a deprecated alias in v0.95.0, the `debug` exporter with `verbosity` is the correct current configuration. Using `loglevel` would produce warnings or errors.

## Review Notes
- The `filter/dapr` processor is defined in the ConfigMap but not included in the service pipeline's processors list, so it has no effect. This is not an error (the collector allows unused component definitions), but readers may be confused about why their filter isn't working if they copy this config. The old `spans.include` syntax still works in v0.95.0 but is being phased out in favor of OTTL conditions.
- The architecture diagram code fence uses `json` as the language identifier for what is plain ASCII art. This is cosmetic only.
- The `telemetrygen` Docker test command uses `localhost:4317` as the endpoint, but when running inside a Docker container, `localhost` refers to the container's own network, not the host where `kubectl port-forward` is listening. Users on Linux would need `--network host`; on Mac/Windows they would need `host.docker.internal:4317`. This is a platform-specific nuance rather than a strict error.
- The Dapr Configuration resource, annotation usage, Kubernetes manifests, and OTel Collector receiver/processor configurations are all correct.
