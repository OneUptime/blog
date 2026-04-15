# Validation Summary: How to Deploy Dapr on Amazon EKS

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Amazon EKS (Elastic Kubernetes Service)
- Helm
- Kubernetes (kubectl, Deployments, HPA, Components)
- eksctl
- AWS CLI
- Redis (as Dapr state store)

## Sources Consulted
- Dapr Helm Charts repository — https://github.com/dapr/helm-charts
- Dapr Dashboard on Artifact Hub — https://artifacthub.io/packages/helm/dapr/dapr-dashboard
- Dapr documentation on Kubernetes deployment — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Configuration overview — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr hello-kubernetes quickstart — https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes
- Dapr docs issue on dashboard removal from Helm chart — https://github.com/dapr/docs/issues/3483
- eksctl documentation — https://eksctl.io/
- Kubernetes HPA v2 API reference — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.27/#horizontalpodautoscaler-v2-autoscaling

## Issues Found

### 1. Dapr Dashboard listed in expected pods output (removed)
**What was wrong:** The verification section listed `dapr-dashboard-xxx` as one of the expected pods after installing Dapr via Helm. Since Dapr v1.11 (June 2023), the dashboard is no longer bundled in the main `dapr/dapr` Helm chart and must be installed separately via `dapr/dapr-dashboard`.
**What was changed:** Removed `dapr-dashboard-xxx` from the expected pod output.

### 2. Dapr Dashboard section missing install command (added)
**What was wrong:** The "Enable Dapr Dashboard" section only showed a `kubectl port-forward` command, assuming the dashboard was already installed. With current Dapr versions, the dashboard requires a separate Helm install.
**What was changed:** Added `helm install dapr-dashboard dapr/dapr-dashboard --namespace dapr-system` command before the port-forward, with a comment noting this is required since Dapr v1.11.

### 3. Incorrect sample container image name (fixed)
**What was wrong:** The deployment used `ghcr.io/dapr/samples/hello-world:latest`, which does not exist. This would cause an `ImagePullBackOff` error.
**What was changed:** Corrected to `ghcr.io/dapr/samples/hello-k8s-node:latest`, which is the actual published image from the Dapr hello-kubernetes quickstart.

## Review Notes
- `global.mtls.enabled=true` is redundant since mTLS is enabled by default in the Dapr Helm chart. It's not incorrect, but readers should know this is the default behavior.
- For production HA deployments, Dapr also provides `global.ha.enabled=true` which sets replica counts to 3 across all control plane components. The post's manual approach of setting individual replica counts to 2 is valid but readers may want to consider the built-in HA profile instead.
- The `eksctl create cluster` command and EKS configuration are correct and follow current eksctl conventions.
- The Dapr Component manifest for Redis state store uses the correct `dapr.io/v1alpha1` API version and valid field names.
- The Kubernetes HPA manifest uses the correct `autoscaling/v2` API version.
- All Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`) are correct and current.
