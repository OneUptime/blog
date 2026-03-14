# Flux CD vs ArgoCD: Which Handles CRDs Better

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, CRD, Kubernetes Operator, GitOps, CustomResourceDefinition, Comparison

Description: Compare CRD lifecycle management in Flux CD and ArgoCD, covering installation ordering, upgrades, and the challenges of managing operator CRDs through GitOps.

---

## Introduction

Custom Resource Definitions are the backbone of the Kubernetes operator ecosystem. Many production workloads depend on CRDs from operators like cert-manager, Prometheus Operator, Istio, and others. Managing CRDs through GitOps presents unique challenges because CRDs must be installed before the resources that use them, and CRD upgrades can break existing custom resources.

Both Flux CD and ArgoCD handle CRDs differently, with different defaults, upgrade behaviors, and dependency management capabilities.

## Prerequisites

- A Kubernetes cluster with Flux CD or ArgoCD installed
- An operator with CRDs to manage (cert-manager used as example)
- Understanding of Kubernetes CRD versioning

## Step 1: Flux CD CRD Management

Flux CD's Kustomize Controller applies CRDs before other resources by default, following the same ordering as `kubectl apply`. For Helm-based operators, the Helm Controller handles CRD installation based on the chart's `crds/` directory.

```yaml
# Install cert-manager CRDs before the operator
# clusters/production/infrastructure/cert-manager.yaml
---
# Step 1: CRDs (applied first due to resource ordering)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/cert-manager/cert-manager
  ref:
    tag: v1.14.0
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 1h
  path: ./deploy/crds
  prune: false  # Never prune CRDs
  wait: true    # Wait for CRDs to be established
  sourceRef:
    kind: GitRepository
    name: cert-manager-crds
---
# Step 2: Operator depends on CRDs being ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: cert-manager-crds  # Explicit dependency ordering
```

## Step 2: CRD Management with Helm Controller

For Helm-based operators, configure CRD handling explicitly:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      version: "v1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  install:
    crds: CreateReplace  # Install and upgrade CRDs
  upgrade:
    crds: CreateReplace
  values:
    installCRDs: true
```

The `crds` field options:
- `Skip`: Do not manage CRDs (manual CRD management)
- `Create`: Only create CRDs on first install, never upgrade
- `CreateReplace`: Create and replace CRDs on upgrades (safest for GitOps)

## Step 3: ArgoCD CRD Management

ArgoCD has a special hook mechanism for CRD ordering using sync waves and resource hooks:

```yaml
# cert-manager CRDs with ArgoCD sync wave
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    argocd.argoproj.io/sync-wave: "-10"  # Apply before other resources
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

ArgoCD Application with CRD management:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
spec:
  source:
    repoURL: https://charts.jetstack.io
    chart: cert-manager
    targetRevision: v1.14.0
    helm:
      parameters:
        - name: installCRDs
          value: "true"
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
      - RespectIgnoreDifferences=true
      # Important: Replace CRDs during sync
      - Replace=true
```

## Comparison Table

| Capability | Flux CD | ArgoCD |
|---|---|---|
| CRD install ordering | Via dependsOn | Via sync waves |
| CRD upgrade handling | Helm: CreateReplace option | syncOptions: Replace=true |
| Prune protection for CRDs | prune: false per Kustomization | Resource exclusion lists |
| CRD health checking | Via wait: true | Via resource health checks |
| Orphan CRD protection | Set prune: false on CRD kustomization | Exclude from prune in settings |

## Step 4: Protecting CRDs from Accidental Deletion

```yaml
# Flux: Separate CRD Kustomization with prune disabled
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-operator-crds
  namespace: flux-system
spec:
  prune: false  # NEVER delete CRDs automatically
  interval: 1h
  path: ./crds/prometheus-operator
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

```yaml
# ArgoCD: Exclude CRDs from pruning in ArgoCD settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.exclusions: |
    - apiGroups:
      - "apiextensions.k8s.io"
      kinds:
      - CustomResourceDefinition
      clusters:
      - "*"
```

## Best Practices

- Never enable automatic pruning for CRDs; a deleted CRD deletes all instances of that resource type cluster-wide.
- Always separate CRD installation into its own Kustomization or sync wave from the operator deployment to ensure ordering.
- Test CRD upgrades in a non-production cluster first; CRD schema changes can invalidate existing custom resources.
- Use Flux's `wait: true` or ArgoCD's health check mechanisms to ensure CRDs are established before dependent resources are applied.
- Pin CRD versions explicitly; automatic SemVer ranges for operator charts can introduce breaking CRD changes.

## Conclusion

Both Flux CD and ArgoCD handle CRDs adequately, but with different mechanisms. Flux CD's explicit `dependsOn` ordering and Helm's `CreateReplace` option provide clean, declarative CRD lifecycle management. ArgoCD's sync waves and the `Replace=true` sync option achieve similar results. The critical operational principle for both is to always keep CRD pruning disabled to prevent catastrophic data loss from accidental deletion.
