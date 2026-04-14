# Validation Summary: How to Use Spot Instances with Dapr on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar annotations, Resiliency CRD, Helm chart)
- Kubernetes (Deployments, podAntiAffinity, nodeSelector, tolerations, preStop hooks)
- AWS EKS (eksctl spot nodegroups)
- GKE (gcloud spot node pools)

## Sources Consulted
- eksctl CLI source code and documentation — `pkg/ctl/cmdutils/nodegroup_flags.go` for flag definitions (`--spot`, `--node-type`, `--instance-types`)
- gcloud container node-pools create reference — https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- GKE Spot VMs documentation — https://docs.cloud.google.com/kubernetes-engine/docs/how-to/spot-vms
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Resiliency spec reference — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr retry policies overview — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Helm chart values.yaml — https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Kubernetes Deployment spec — https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found

### 1. eksctl command used `--node-type` instead of `--instance-types` (fixed)
**What was wrong:** The eksctl command used `--node-type m5.large` which only specifies a single instance type. For spot instances, AWS best practice is to provide multiple instance types via `--instance-types` so that capacity can be drawn from a larger pool, reducing interruption frequency.
**What was changed:** Replaced `--node-type m5.large` with `--instance-types m5.large,m5a.large,m4.large`.

### 2. Kubernetes Deployment YAML missing required `selector` and pod labels (fixed)
**What was wrong:** The Deployment manifest was missing the required `spec.selector.matchLabels` field (required in `apps/v1`) and `spec.template.metadata.labels`. Additionally, the `podAntiAffinity` rule referenced `app: orders-api` as a label selector, but this label was never defined on the pod template — meaning the anti-affinity rule would not match any pods.
**What was changed:** Added `spec.selector.matchLabels.app: orders-api` and `spec.template.metadata.labels.app: orders-api` to make the Deployment valid and the anti-affinity rule functional.

### 3. Dapr Helm chart value path was incorrect (fixed)
**What was wrong:** The Helm command used `--set dapr_operator.nodeSelector.…` but there is no `dapr_operator.nodeSelector` parameter in the Dapr Helm chart. The correct path is `global.nodeSelector`, which applies the nodeSelector to all Dapr control plane components.
**What was changed:** Replaced `dapr_operator.nodeSelector` with `global.nodeSelector` in the Helm command.

## Review Notes
- The gcloud command includes `--node-labels "cloud.google.com/gke-spot=true"` which is redundant since GKE automatically applies this label to spot node pools. Not technically wrong, just unnecessary.
- The Resiliency CRD includes a `duration: 1s` field with `policy: exponential`. Official Dapr documentation examples for exponential retry do not include the `duration` field (only `maxInterval` and `maxRetries`). It may function as the initial backoff seed, but this is not explicitly documented. Left as-is since it does not cause errors.
- The `global.nodeSelector` Helm value applies to all Dapr control plane components (operator, sidecar injector, placement, sentry), not just the operator. The blog text implies only the operator is affected. This is acceptable since pinning all control plane components to on-demand nodes is the correct practice.
