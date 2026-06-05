# Validation Summary: How to Deploy the OpenTelemetry Collector as a Sidecar in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Operator
- Kubernetes Deployments, Pods, ConfigMaps, and Secrets
- Kubernetes sidecar containers
- OTLP over gRPC and HTTP
- OpenTelemetry Collector processors, exporters, connectors, extensions, and internal telemetry

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector component documentation: https://opentelemetry.io/docs/collector/components/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Operator documentation and README: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Operator release manifest and CRD schema: https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
- OpenTelemetry Collector Contrib routing connector README for v0.95.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.95.0/connector/routingconnector
- OpenTelemetry Collector Contrib health check extension README for v0.95.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.95.0/extension/healthcheckextension
- `otel/opentelemetry-collector-contrib:0.95.0 validate` command output

## Issues Found
- Changed the basic sidecar memory limiter from `limit_mib: 128` to `limit_mib: 96` so it stays below the container's 128Mi memory limit, matching the article's later 75% sizing guidance.
- Updated Collector environment variable references from `${VAR}` to `${env:VAR}`, which matches current Collector configuration documentation.
- Fixed the routing connector OTTL statements for the pinned Collector Contrib v0.95.0 example by using `attributes["tenant.id"]` instead of `resource.attributes["tenant.id"]`.
- Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` to the multi-tenant application example because the local receiver in that example only enables OTLP/gRPC on port 4317.
- Replaced unsupported automatic sidecar injection annotations with the Operator-supported `sidecar.opentelemetry.io/inject` annotation and clarified that sidecar configuration and resources come from an `OpenTelemetryCollector` resource.
- Replaced the incorrect `Instrumentation` resource sidecar example with an `OpenTelemetryCollector` resource using `spec.mode: sidecar`. `Instrumentation` resources are for auto-instrumentation, not collector sidecar injection.
- Added the cert-manager prerequisite note for installing the OpenTelemetry Operator from the release manifest.
- Updated the monitoring example to enable the `health_check` extension before using Kubernetes probes against port 13133.
- Replaced deprecated/ignored `service.telemetry.metrics.address` usage with the current Prometheus pull reader configuration.

## Review Notes
- Collector configuration fragments for the basic sidecar, payment processor, multi-tenant routing connector, and Operator sidecar collector config were validated with `otel/opentelemetry-collector-contrib:0.95.0 validate`.
- The post still pins `otel/opentelemetry-collector-contrib:0.95.0`, which is old. The examples now validate for that version, but future production deployments should review current Collector release notes before adopting the image tag.
