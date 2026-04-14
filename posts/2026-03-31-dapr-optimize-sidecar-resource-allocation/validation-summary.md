# Validation Summary: How to Optimize Dapr Sidecar Resource Allocation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, daprd)
- Kubernetes (Deployments, annotations, resource requests/limits)
- Helm (Dapr chart configuration)
- Prometheus (PromQL, cAdvisor metrics)
- Vertical Pod Autoscaler (VPA)

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr production guidelines on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Kubernetes VPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- cAdvisor Prometheus metrics: https://github.com/google/cadvisor/blob/master/metrics/prometheus.go
- Cross-referenced with validated sibling post: posts/2026-03-31-dapr-sidecar-resource-limits/README.md

## Issues Found

1. **Incorrect Helm values structure**: The blog used a non-existent nested Helm value path `dapr_operator.sidecarInjector.defaultCPURequest` (and similar for limit/memory). Corrected to use the actual flat Helm values under `dapr_sidecar_injector`: `sidecarCPURequest`, `sidecarCPULimit`, `sidecarMemoryRequest`, `sidecarMemoryLimit`. This matches the official Dapr Helm chart and was confirmed against an already-validated sibling blog post.

## Review Notes
- The sidecar resource usage estimates (idle: 20-40 MB / 1-5m CPU; active: 50-100 MB / 50-200m CPU) are reasonable observations but are not from official Dapr documentation. They are presented as typical values, which is appropriate.
- The Prometheus queries use standard cAdvisor metrics and correct PromQL subquery syntax.
- The VPA configuration is valid standard Kubernetes VPA usage and correctly targets the `daprd` container by name.
- The per-pod annotation names (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-memory-limit`) are all correct.
- The `kubectl top pods --containers -A` command syntax is correct.
