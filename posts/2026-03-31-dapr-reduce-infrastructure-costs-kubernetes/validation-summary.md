# Validation Summary: How to Reduce Dapr Infrastructure Costs on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, control plane, component scoping, Configuration CRD)
- Kubernetes (annotations, PodDisruptionBudgets, node selectors, tolerations, Helm)
- Kubecost (cost analysis, Allocation API)

## Sources Consulted
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Component scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Kubecost Allocation API: https://docs.kubecost.com/apis/monitoring-apis/api-allocation
- Kubernetes well-known labels: https://kubernetes.io/docs/reference/node/node-labels/

## Issues Found

### 1. Incorrect field name in Dapr Configuration spec (Section 2)
- **What was wrong:** The Configuration YAML used `metric` (singular) for disabling metrics collection. The correct field name in the Dapr Configuration CRD is `metrics` (plural).
- **What was changed:** Changed `metric:` to `metrics:` in the Configuration YAML snippet.
- **Why:** Using the wrong field name would cause the configuration to be silently ignored, meaning metrics would remain enabled despite the user's intent to disable them.

### 2. Invalid Helm chart parameter for placement service (Section 4)
- **What was wrong:** The Helm values included `dapr_placement.replicaCount: 1`, but the Dapr placement service does not support a `replicaCount` Helm parameter. Placement replicas are controlled by `global.ha.enabled` (3 replicas when true, 1 when false).
- **What was changed:** Removed the `dapr_placement.replicaCount: 1` line from the Helm values. Since `global.ha.enabled: false` is already set, the placement service will correctly run with 1 replica.
- **Why:** Including an unsupported Helm value could cause confusion or unexpected behavior during `helm upgrade`.

## Review Notes
- The `node.kubernetes.io/lifecycle: spot` label shown in Section 5 is a common convention but not a cloud-provider-supplied label. Actual spot/preemptible node labels vary by provider (e.g., `eks.amazonaws.com/capacityType: SPOT` on EKS, `cloud.google.com/gke-spot: "true"` on GKE). The blog's general approach is correct, but users will need to adjust the label to match their cloud provider.
- The sidecar memory limit of 64Mi in Section 2 is technically valid but quite tight. Depending on the number of components loaded and gRPC connections, the daprd sidecar may need more memory in practice. Users should monitor for OOM kills.
- The 30-50% cost reduction claim in the summary is a reasonable estimate but will vary significantly depending on the specific deployment topology and workload characteristics.
