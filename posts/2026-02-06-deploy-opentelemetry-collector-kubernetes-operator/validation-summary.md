# Validation Summary: How to Deploy the OpenTelemetry Collector with the Kubernetes Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry Collector and Collector Contrib
- Kubernetes custom resources, Deployments, DaemonSets, StatefulSets, Services, ConfigMaps, ServiceAccounts, and RBAC
- cert-manager
- Prometheus Remote Write
- Prometheus Operator ServiceMonitor and PodMonitor resources
- OpenTelemetry auto-instrumentation

## Sources Consulted
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator API reference for OpenTelemetryCollector: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/api/opentelemetrycollectors.md
- OpenTelemetry Operator API reference for Instrumentation: https://github.com/open-telemetry/opentelemetry-operator/blob/main/docs/api/instrumentations.md
- OpenTelemetry Operator Target Allocator documentation and README: https://github.com/open-telemetry/opentelemetry-operator/blob/main/README.md and https://github.com/open-telemetry/opentelemetry-operator/blob/main/cmd/otel-allocator/README.md
- OpenTelemetry auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/

## Issues Found
- The OpenTelemetryCollector examples used deprecated `opentelemetry.io/v1alpha1` resources with string-based `spec.config`. Updated Collector CR examples to `opentelemetry.io/v1beta1` and structured `spec.config`, matching the current Operator API.
- The examples pinned old Collector and cert-manager versions. Updated Collector Contrib examples to `0.153.0`, cert-manager to `v1.20.2`, and the Operator upgrade example to `v0.152.0`.
- The gateway example used the old `logging` exporter with Collector `0.93.0`. Replaced it with the current `debug` exporter and updated pipeline references.
- Internal OTLP forwarding examples configured TLS for in-cluster plaintext Services. Set `tls.insecure: true` for agent-to-gateway and sidecar-to-gateway OTLP exporters.
- The Target Allocator example manually configured `target_allocator` in the Collector config. Updated it to the Operator-supported pattern where `prometheus.config` is provided and the Operator rewrites the receiver configuration during reconciliation.
- The Target Allocator example set a ServiceAccount but did not mention RBAC. Added a note that the ServiceAccount needs permissions to read ServiceMonitor and PodMonitor resources when `prometheusCR` is enabled.
- The ConfigMap section incorrectly treated `spec.configmaps` as a replacement for `spec.config` and used a non-current `key` field. Updated it to show `spec.config` as required and `configmaps` with the current `mountpath` field.
- The Go auto-instrumentation note incorrectly said Go requires code changes. Updated it to state the current Operator requirements: the Go feature gate and target executable configuration.

## Review Notes
YAML snippets parse successfully. Four standalone Collector configs were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The Target Allocator Collector config is not valid as a standalone Collector config before Operator reconciliation because the Operator rewrites it to include the Target Allocator endpoint.
