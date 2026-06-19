# Validation Summary: How to Configure OpenTelemetry for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry auto-instrumentation
- Kubernetes Deployments, Services, ConfigMaps, DaemonSets, RBAC, and Downward API
- Helm
- OTLP over gRPC and HTTP
- Kubernetes metrics receivers, including kubeletstats and k8s_cluster
- Istio tracing with OpenTelemetry

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator automatic instrumentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Kubernetes Collector components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OTLP exporter environment variables: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Collector debug exporter: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Kubernetes events receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8seventsreceiver/README.md
- OpenTelemetry Collector transform processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Istio OpenTelemetry tracing: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/

## Issues Found
- Updated the `OpenTelemetryCollector` example from `opentelemetry.io/v1alpha1` to `opentelemetry.io/v1beta1` and changed `spec.config` from a block string to structured YAML, matching current OpenTelemetry Operator examples.
- Added `K8S_NODE_NAME` to the operator-managed collector pod environment and changed collector substitutions to `${env:K8S_NODE_NAME}`, matching current collector environment provider syntax.
- Replaced deprecated/removed `logging` exporter examples with the current `debug` exporter and updated pipeline references accordingly.
- Reordered `memory_limiter` before other processors in pipelines so memory limiting happens early in the collector pipeline.
- Corrected application and sidecar OTLP examples to set `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` when using port `4317`, because the default protocol is SDK-dependent.
- Corrected the OpenTelemetry Operator service DNS name in examples to `otel-collector-collector...`, which follows the operator service naming pattern for an `OpenTelemetryCollector` named `otel-collector`.
- Added the missing `selector` and pod template labels to the sidecar `apps/v1` Deployment example.
- Updated the Istio `Telemetry` resource from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1` and removed the stale Zipkin tracing configuration from the OpenTelemetry example.
- Updated collector internal metrics configuration from the older `metrics.address` form to the current `readers.pull.exporter.prometheus` form.

## Review Notes
The examples still use placeholder backend endpoints and `latest` image tags. Those are acceptable for a general guide, but production deployments should pin collector and instrumentation image versions and tailor RBAC to the exact receivers enabled.
