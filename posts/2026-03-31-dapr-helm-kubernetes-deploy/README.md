# How to Deploy Dapr with Helm on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Helm, Kubernetes, Deployment, Installation

Description: Learn how to install and configure Dapr on Kubernetes using Helm, including production-ready configuration options, HA deployment, and upgrade procedures.

---

## Introduction

While `dapr init -k` provides a quick start, Helm is the recommended method for production Dapr deployments on Kubernetes. Helm allows you to version-control your Dapr configuration, customize resource limits, enable high availability, and integrate with existing GitOps workflows.

## Prerequisites

- Kubernetes (supported versions per [Dapr's version skew policy](https://docs.dapr.io/operations/support/support-release-policy/))
- Helm 3.x installed
- `kubectl` configured for your cluster
- Sufficient RBAC permissions to create cluster-level resources

## Step 1: Add the Dapr Helm Repository

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# List available Dapr versions
helm search repo dapr --versions | head -5
```

## Step 2: Install Dapr (Basic)

Install to the `dapr-system` namespace:

```bash
kubectl create namespace dapr-system

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --wait
```

## Step 3: Production Installation with Custom Values

Create a `dapr-values.yaml` file:

```yaml
global:
  logAsJson: true
  imagePullPolicy: IfNotPresent
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"

dapr_operator:
  replicaCount: 2
  resources:
    requests:
      cpu: "100m"
      memory: "200Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"

dapr_placement:
  replicaCount: 3
  ha:
    enabled: true
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "1Gi"
  cluster:
    logStorePath: "/var/run/dapr/raft-log"

dapr_sentry:
  replicaCount: 2
  resources:
    requests:
      cpu: "50m"
      memory: "128Mi"
    limits:
      cpu: "200m"
      memory: "256Mi"

dapr_sidecar_injector:
  replicaCount: 2
  resources:
    requests:
      cpu: "50m"
      memory: "128Mi"
    limits:
      cpu: "200m"
      memory: "256Mi"

dapr_scheduler:
  replicaCount: 3
  ha:
    enabled: true
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "1Gi"
```

Install with custom values:

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --values dapr-values.yaml \
  --wait
```

## Step 4: Verify the Installation

```bash
kubectl get pods -n dapr-system

dapr status -k
```

Expected output:

```text
  NAME                   NAMESPACE    HEALTHY  STATUS   REPLICAS  VERSION
  dapr-operator          dapr-system  True     Running  2         1.x.x
  dapr-placement-server  dapr-system  True     Running  3         1.x.x
  dapr-sentry            dapr-system  True     Running  2         1.x.x
  dapr-sidecar-injector  dapr-system  True     Running  2         1.x.x
  dapr-scheduler-server  dapr-system  True     Running  3         1.x.x
```

## Step 5: Configure Custom Sidecar Defaults

Set default sidecar security settings applied to all apps:

```yaml
dapr_sidecar_injector:
  sidecarDropALLCapabilities: true
  sidecarRunAsNonRoot: true
  sidecarReadOnlyRootFilesystem: true
```

## Step 6: Enable Dapr Dashboard

```bash
helm install dapr-dashboard dapr/dapr-dashboard \
  --namespace dapr-system
```

Access:

```bash
kubectl port-forward svc/dapr-dashboard 8080:8080 -n dapr-system
open http://localhost:8080
```

## Step 7: Upgrade Dapr

```bash
# Update repo
helm repo update

# Check current and available versions
helm list -n dapr-system
helm search repo dapr/dapr --versions | head -10

# Upgrade
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --values dapr-values.yaml \
  --wait
```

## Step 8: Uninstall Dapr

```bash
helm uninstall dapr --namespace dapr-system

# Clean up CRDs (optional - this removes all Dapr custom resources)
kubectl delete crd \
  components.dapr.io \
  configurations.dapr.io \
  httpendpoints.dapr.io \
  resiliency.dapr.io \
  subscriptions.dapr.io
```

## Using GitOps with Dapr Helm

Store your `dapr-values.yaml` in a Git repository and use Argo CD or Flux to manage the release:

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://dapr.github.io/helm-charts/
    chart: dapr
    targetRevision: "1.14.0"
    helm:
      values: |
        global:
          logAsJson: true
          mtls:
            enabled: true
        dapr_operator:
          replicaCount: 2
        dapr_placement:
          replicaCount: 3
        dapr_sentry:
          replicaCount: 2
        dapr_sidecar_injector:
          replicaCount: 2
  destination:
    server: https://kubernetes.default.svc
    namespace: dapr-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Common Helm Configuration Options

| Option | Description | Default |
|---|---|---|
| `global.mtls.enabled` | Enable mTLS | `true` |
| `dapr_operator.replicaCount` | Operator replicas | `1` |
| `dapr_placement.replicaCount` | Placement replicas (use 3 for HA) | `1` |
| `dapr_sentry.replicaCount` | Sentry replicas | `1` |
| `dapr_sidecar_injector.replicaCount` | Injector replicas | `1` |
| `global.logAsJson` | JSON structured logs | `false` |
| `global.imagePullPolicy` | Container image pull policy | `IfNotPresent` |

## Summary

Helm is the recommended way to deploy Dapr in production. Create a `dapr-values.yaml` with HA replica counts (2-3 per component), resource limits, and mTLS configuration. Use `helm upgrade` for version upgrades with the `--wait` flag to ensure healthy rollout. Integrate with GitOps tools by storing your values file in version control and automating upgrades through Argo CD or Flux. Always verify the deployment with `dapr status -k` after install or upgrade.
