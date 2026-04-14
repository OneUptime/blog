# Validation Summary: How to Set Dapr Sidecar Resource Limits on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, annotations, Helm chart)
- Kubernetes (Deployments, resource requests/limits, QoS classes, LimitRange, events)
- Helm (Dapr chart configuration)
- Prometheus (metrics queries for monitoring)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Helm chart source (dapr_sidecar_injector values.yaml): https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Kubernetes Pod QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Events API: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/

## Issues Found

1. **Removed misleading "Set Resources via Dapr Configuration" section.** The post included a section claiming you could "Define resource defaults in a Dapr Configuration resource" with a YAML example showing a Configuration CRD. However, the Dapr Configuration CRD does not support sidecar resource fields — the example only showed `tracing` and `metric` settings with no resource configuration at all. The section was removed to avoid misleading readers.

2. **Fixed incorrect Prometheus metric name.** The post used `dapr_sidecar_cpu_seconds_total{app_id="payment-service"}` which is not a real Dapr metric. Changed to `process_cpu_seconds_total{app_id="payment-service"}`, which is the standard process metric exposed by the Dapr sidecar via the Go Prometheus client library.

3. **Fixed incorrect Kubernetes event reason string.** The post used `kubectl get events --field-selector reason=OOMKilling`. The correct event reason in Kubernetes is `OOMKilled` (past tense), not `OOMKilling`. Changed to `reason=OOMKilled`.

## Review Notes
- The Helm values paths (`dapr_sidecar_injector.sidecarCPURequest`, etc.) could not be conclusively confirmed in the current Dapr Helm chart `values.yaml`. They may be valid in certain Dapr versions or handled through top-level chart overrides. Readers should verify these paths against their specific Dapr version's Helm chart documentation.
- The QoS class discussion is correct at the pod level but slightly simplified — QoS class applies to the entire pod, not individual containers. If the application container has resource limits but the sidecar does not, the pod would be Burstable rather than BestEffort. The post's explanation is adequate for the intended audience.
- The recommended resource sizing table provides reasonable guidance but is not from official Dapr documentation — it represents practical estimates. Readers should benchmark their specific workloads.
- The `container_memory_working_set_bytes{container="daprd"}` Prometheus query is correct and standard for monitoring container memory via cAdvisor/kubelet metrics.
