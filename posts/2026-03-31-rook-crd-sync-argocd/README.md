# How to Handle Rook CRD Sync Issues in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ArgoCD, CRD, GitOps, Kubernetes

Description: Learn how to resolve common Rook CRD sync issues in ArgoCD including too-big annotations, upgrade conflicts, and CRD ownership management.

---

## Common CRD Sync Issues

Rook's CRDs are large and complex. ArgoCD has specific limitations that cause sync failures:

1. CRD annotations exceed the 256KB kubectl annotation limit
2. Server-side apply conflicts with existing CRD fields
3. ArgoCD trying to delete CRDs during prune operations
4. CRD version conflicts during Rook upgrades

## Issue 1: CRD Too Large for kubectl Annotation

Rook CRDs exceed the size limit for `kubectl.kubernetes.io/last-applied-configuration` annotation:

```yaml
Error: metadata.annotations: Too long: must have at most 262144 bytes
```

Fix: Use Server-Side Apply in ArgoCD sync options:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rook-ceph-crds
spec:
  syncPolicy:
    syncOptions:
    - ServerSideApply=true
```

## Issue 2: Separate CRD Application

Best practice is to manage CRDs in a separate ArgoCD Application to control installation order:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rook-ceph-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
spec:
  source:
    repoURL: https://github.com/rook/rook
    targetRevision: v1.14.0
    path: deploy/examples
    directory:
      include: "crds.yaml"
  syncPolicy:
    syncOptions:
    - ServerSideApply=true
    - CreateNamespace=false
```

## Issue 3: Preventing CRD Deletion on Prune

Configure ArgoCD to never delete CRDs (they may be shared across applications):

```yaml
spec:
  syncPolicy:
    automated:
      prune: true
  ignoreDifferences:
  - group: apiextensions.k8s.io
    kind: CustomResourceDefinition
    jsonPointers:
    - /status
```

Add a `Preserve` annotation to CRDs in Git:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: "Prune=false"
```

## Issue 4: CRD Version Conflicts During Upgrade

When upgrading Rook, new CRD versions are added. Apply CRDs first:

```bash
# Apply CRDs manually before ArgoCD syncs the operator
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/crds.yaml \
  --server-side

# Then trigger ArgoCD sync
argocd app sync rook-ceph-operator
```

## Issue 5: Field Manager Conflicts

If fields were previously managed by kubectl and now ArgoCD uses server-side apply:

```bash
# Force field manager ownership
kubectl apply -f crds.yaml \
  --server-side \
  --field-manager=argocd \
  --force-conflicts
```

## Verifying CRD Sync Status

```bash
argocd app get rook-ceph-crds
kubectl get crd | grep ceph
kubectl api-resources | grep ceph
```

## Summary

Rook CRD sync issues in ArgoCD are best resolved by separating CRDs into their own Application with `ServerSideApply=true`, preventing CRD pruning via annotations, and pre-applying CRDs before operator upgrades. Managing CRDs and the operator in separate sync waves ensures correct installation order.
