# How to Manage Rook-Ceph with ArgoCD Application Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ArgoCD, GitOps, Application Set, Kubernetes

Description: Learn how to manage Rook-Ceph deployments across multiple clusters using ArgoCD ApplicationSets, enabling consistent GitOps-driven storage provisioning at scale.

---

## Why Use ApplicationSets for Rook

ArgoCD ApplicationSets enable templated, multi-cluster Rook deployments from a single Git source. Instead of maintaining separate ArgoCD Applications per cluster, one ApplicationSet generates Applications for all target clusters automatically.

## Setting Up the Git Repository Structure

Organize your Rook configuration for ApplicationSet compatibility:

```text
rook-gitops/
  base/
    crds.yaml
    operator.yaml
    cluster.yaml
    storageclass.yaml
  overlays/
    prod-us-east/
      kustomization.yaml
      cluster-patch.yaml
    prod-eu-west/
      kustomization.yaml
      cluster-patch.yaml
    staging/
      kustomization.yaml
      cluster-patch.yaml
```

## Creating the ApplicationSet

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: rook-ceph
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: prod-us-east
        url: https://k8s-us-east.example.com
        env: production
      - cluster: prod-eu-west
        url: https://k8s-eu-west.example.com
        env: production
      - cluster: staging
        url: https://k8s-staging.example.com
        env: staging
  template:
    metadata:
      name: "rook-ceph-{{cluster}}"
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/myorg/rook-gitops
        targetRevision: HEAD
        path: "overlays/{{cluster}}"
      destination:
        server: "{{url}}"
        namespace: rook-ceph
      syncPolicy:
        automated:
          prune: false
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
        - ServerSideApply=true
```

## Using Cluster Generator for Dynamic Discovery

Instead of static list, use the cluster generator to auto-include new clusters:

```yaml
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          rook-ceph: "enabled"
  template:
    metadata:
      name: "rook-ceph-{{name}}"
    spec:
      source:
        repoURL: https://github.com/myorg/rook-gitops
        path: "overlays/{{metadata.labels.environment}}"
      destination:
        server: "{{server}}"
        namespace: rook-ceph
```

Label your clusters:

```bash
kubectl label secret cluster-prod-us-east \
  -n argocd \
  rook-ceph=enabled \
  environment=production
```

## Managing CRD Installation Order

Rook CRDs must be installed before the operator. Use sync waves:

```yaml
# In crds.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

# In operator.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

# In cluster.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Summary

ArgoCD ApplicationSets simplify managing Rook-Ceph across multiple Kubernetes clusters by generating per-cluster Applications from a single template. Combined with Kustomize overlays for environment-specific configuration and sync waves for installation ordering, this enables reliable GitOps-driven storage management at scale.
