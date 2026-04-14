# Validation Summary: How to Monitor Dapr Sidecar Resource Consumption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, annotations, Configuration CRD)
- Kubernetes (container metrics, resource limits/requests, deployments)
- Prometheus (PromQL queries, PrometheusRule alerting, HTTP API)
- cAdvisor (container-level resource metrics)
- kube-state-metrics

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found

1. **Incorrect metric name `kube_pod_container_resource_usage`**: The post claimed Kubernetes exposes container-level metrics through `kube_pod_container_resource_usage` (kube-state-metrics). This metric does not exist. kube-state-metrics exposes `kube_pod_container_resource_requests` and `kube_pod_container_resource_limits` for resource specifications. Actual usage metrics come from cAdvisor (via kubelet). Fixed the description to correctly attribute usage metrics to cAdvisor and reference the correct kube-state-metrics metric names.

2. **Misleading Dapr Configuration CRD section**: The post showed an empty Dapr Configuration CRD (`spec: features: []`) claiming it sets cluster-wide resource defaults. The Dapr Configuration CRD does not support sidecar resource configuration. Removed this section and added a note clarifying that per-pod annotations are the recommended approach.

3. **Incorrect Helm values structure**: The post showed a `dapr_sidecar_injector.sidecarContainers.daprd.resources` Helm values structure that does not exist in the Dapr Helm chart. Per the official documentation: "When installing Dapr using Helm, no default limit/request values are set." The `dapr_sidecar_injector.resources` value in the Helm chart configures the injector service itself, not the injected sidecars. Removed this section and noted that Helm does not support default sidecar resource configuration.

4. **Invalid Prometheus API time parameters**: The curl command for `query_range` used `start=1h ago` and `end=now`, which are not valid. The Prometheus HTTP API requires RFC3339 timestamps or Unix timestamps in seconds. Fixed the command to compute Unix timestamps using shell variables.

## Review Notes
- The Dapr sidecar resource annotations (`dapr.io/sidecar-cpu-request`, etc.) are correct and verified against official documentation.
- The PrometheusRule alert expressions are syntactically correct. `container_spec_memory_limit_bytes` and `container_cpu_cfs_throttled_seconds_total` are valid cAdvisor metrics.
- The `humanizePercentage` template function in the alert annotation is valid Prometheus syntax.
- The `kubectl top pods --containers -A | grep daprd` command is correct.
- The production recommendation from Dapr docs suggests CPU limit of 300m and memory limit of 1000Mi, which differs from the 200m/256Mi used in the post's examples. The post's values are not wrong (they are just different configuration choices), but readers targeting production should consult the official Dapr production guidelines.
