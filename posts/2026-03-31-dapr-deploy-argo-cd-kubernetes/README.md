# How to Deploy Dapr with Argo CD on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Argo CD, GitOps, Deployment

Description: Learn how to deploy and manage Dapr on Kubernetes using Argo CD for GitOps-based continuous delivery with automated sync and rollback.

---

## Overview

Deploying Dapr using Argo CD brings GitOps discipline to your microservices infrastructure. By storing Dapr configuration in Git and letting Argo CD manage the sync, you gain version control, audit trails, and automated drift correction.

## Prerequisites

- Kubernetes cluster (v1.24+)
- Argo CD installed
- Helm CLI
- `kubectl` configured

## Step 1: Add the Dapr Helm Repository

First, register the Dapr Helm chart as an Argo CD application source.

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update
```

## Step 2: Create the Dapr Namespace

```bash
kubectl create namespace dapr-system
```

## Step 3: Define the Argo CD Application

Create an Argo CD Application manifest that points to the Dapr Helm chart:

```yaml
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
    targetRevision: 1.14.0
    helm:
      values: |
        global:
          ha:
            enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: dapr-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply it:

```bash
kubectl apply -f dapr-argocd-app.yaml
```

## Step 4: Monitor the Deployment

```bash
argocd app get dapr
argocd app sync dapr
```

Watch the rollout:

```bash
kubectl rollout status deployment/dapr-operator -n dapr-system
kubectl get pods -n dapr-system
```

## Step 5: Store Component Configs in Git

Add your Dapr component files to a Git repository and create another Argo CD application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-components
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/dapr-config
    targetRevision: HEAD
    path: components/production
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Step 6: Upgrade Dapr via GitOps

To upgrade, update `targetRevision` in your Application manifest and commit:

```bash
git diff
# targetRevision: 1.14.0 -> 1.15.0
git commit -am "chore: upgrade Dapr to 1.15.0"
git push
```

Argo CD detects the change and rolls out the upgrade automatically.

## Summary

Deploying Dapr with Argo CD combines the power of the Dapr runtime with GitOps best practices. You get automated synchronization, self-healing deployments, and full Git history for every configuration change. This approach is ideal for teams managing multiple environments or needing audit compliance.
