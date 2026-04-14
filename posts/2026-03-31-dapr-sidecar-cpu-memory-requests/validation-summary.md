# Validation Summary: How to Configure Dapr Sidecar CPU and Memory Requests

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, sidecar injector)
- Kubernetes (pod annotations, resource requests/limits, scheduling)
- Helm
- Prometheus (container metrics)
- kubectl

## Sources Consulted
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Production Guidelines on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Sidecar Injector Overview: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr Helm Chart values.yaml (sidecar injector): https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Dapr Helm Chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr injector source code (annotations.go, sidecar.go, sidecar_container.go)
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
1. **Incorrect Helm chart values for global sidecar resource defaults.** The post claimed you could set global sidecar CPU/memory defaults using `dapr_sidecar_injector.defaultConfig.cpuRequest`, `dapr_sidecar_injector.defaultConfig.memoryRequest`, `dapr_sidecar_injector.defaultConfig.cpuLimit`, and `dapr_sidecar_injector.defaultConfig.memoryLimit` via Helm. These Helm values do not exist in the Dapr Helm chart. The `resources:` key in the sidecar injector subchart controls the injector webhook deployment itself, not the injected sidecar containers. Dapr does not support setting global default sidecar resources via Helm — the only supported mechanism is per-pod annotations. **Fix:** Rewrote the section to explain this limitation and provided a Kyverno ClusterPolicy example as a practical alternative for applying resource annotations consistently across deployments.

## Review Notes
- The Dapr production guidelines recommend slightly different default values than those in the post (CPU request: 100m, limit: 300m; memory request: 250Mi, limit: 1000Mi). The post's values are reasonable but users may want to consult the official production guidelines for Dapr's own recommendations.
- The claim that "the Dapr injector does not set resource requests or limits" by default is confirmed by official documentation.
- All four sidecar resource annotation names (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-limit`) are correct per official Dapr documentation.
- The sidecar container name `daprd` used in the Prometheus query is correct.
- The `kubectl top pod --containers` command syntax is correct.
