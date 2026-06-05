# Validation Summary: How to Fix Collector 'Connection Refused' on OTLP Ports

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- Collector receiver, processor, exporter, extension, and telemetry configuration
- Kubernetes Deployments, Services, ConfigMaps, and probes
- Linux networking and firewall diagnostics
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry OTLP Receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Docker install docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector extensions registry: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes probe docs: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- OneUptime OpenTelemetry Collector docs: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- Replaced `logging` exporter examples with `debug`, because current Collector docs use the `debug` exporter and note `logging` was for older releases.
- Added the missing `debug` exporter definition to the receiver fix snippet so the Collector configuration is complete.
- Replaced deprecated `service.telemetry.metrics.address` with the current `service.telemetry.metrics.readers` Prometheus pull configuration.
- Updated the Kubernetes Collector image from `otel/opentelemetry-collector-contrib:0.95.0` to the current official release image `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.153.0`.
- Added the missing `health_check` extension and `service.extensions` entry to the Kubernetes ConfigMap so the liveness and readiness probes on port 13133 have a Collector endpoint to call.
- Added `check_interval: 2s` to the Kubernetes `memory_limiter` processor because Collector 0.153.0 requires it to be greater than zero.
- Added the health-check container port to the Kubernetes Deployment for clarity.
- Corrected the OTLP HTTP test expectation from a fixed `400 Bad Request` to a broader successful reachability check, because an empty JSON OTLP request may return a 2xx response depending on parsing and Collector behavior.

## Review Notes
- Verified the updated Collector image with `otelcol-contrib version 0.153.0`.
- Validated representative production and Kubernetes Collector configurations with `otelcol-contrib validate` from the 0.153.0 image.
- `telnet`, `nc`, `ss`, `lsof`, firewall, and `kubectl` commands are appropriate for the diagnostic use cases shown, though exact package availability varies by OS and container image.
