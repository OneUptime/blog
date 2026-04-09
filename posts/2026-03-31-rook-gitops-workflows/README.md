# How to Set Up Rook-Ceph for GitOps Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GitOps, ArgoCD, Flux, Kubernetes, Storage

Description: Learn how to manage Rook-Ceph deployments using GitOps workflows with ArgoCD or Flux, enabling declarative, version-controlled cluster storage management.

---

GitOps applies the principles of Git version control to infrastructure management. Rook-Ceph is fully declarative through its Kubernetes CRDs, making it an ideal fit for GitOps workflows where all configuration changes flow through Git before being applied to the cluster.

## Why GitOps for Rook-Ceph

- Every storage configuration change is tracked in Git history
- Rollbacks are as simple as reverting a commit
- Cluster state is always reconcilable from the repository
- Pull request reviews enforce approval before storage changes take effect

## Repository Structure for Rook-Ceph

Organize your GitOps repository to separate Rook infrastructure concerns:

```text
infrastructure/
  rook-ceph/
    operator/
      namespace.yaml
      helmrelease.yaml
    cluster/
      cephcluster.yaml
      blockpool.yaml
      filesystem.yaml
      objectstore.yaml
      storageclasses.yaml
    policies/
      networkpolicies.yaml
      podsecuritystandards.yaml
```

## Deploying Rook with ArgoCD

Create an ArgoCD Application for the Rook operator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rook-ceph-operator
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/myorg/infra-gitops
    targetRevision: main
    path: infrastructure/rook-ceph/operator
  destination:
    server: https://kubernetes.default.svc
    namespace: rook-ceph
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

Create a separate Application for the cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rook-ceph-cluster
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/myorg/infra-gitops
    targetRevision: main
    path: infrastructure/rook-ceph/cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: rook-ceph
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
```

Note: `prune: false` for the cluster prevents accidental deletion of the CephCluster resource if it is removed from Git.

## Using Flux for Rook-Ceph Management

With Flux, define Kustomizations for each Rook component:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-ceph-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/rook-ceph/operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: infra-repo
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: rook-ceph-operator
      namespace: rook-ceph
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-ceph-cluster
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/rook-ceph/cluster
  prune: false
  sourceRef:
    kind: GitRepository
    name: infra-repo
  dependsOn:
    - name: rook-ceph-operator
```

## Managing Secrets with Sealed Secrets or SOPS

Never commit plain Ceph keyrings to Git. Use encryption:

```bash
# Encrypt with SOPS before committing
sops --encrypt \
  --kms arn:aws:kms:us-east-1:123456789012:key/my-key \
  ./infrastructure/rook-ceph/cluster/admin-keyring.yaml > \
  ./infrastructure/rook-ceph/cluster/admin-keyring.enc.yaml
```

## Summary

Rook-Ceph's CRD-based configuration maps perfectly to GitOps workflows. ArgoCD and Flux both support reconciling Rook CRDs from a Git repository, providing version-controlled, auditable storage infrastructure management. Setting `prune: false` on the cluster Application prevents accidents, and secret management tools like SOPS or Sealed Secrets protect sensitive keyring data in the repository.
