# How to Manage Multi-Cluster Rook-Ceph with GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GitOps, Multi-Cluster, ArgoCD, Kubernetes

Description: Learn how to manage Rook-Ceph across multiple Kubernetes clusters with GitOps using ArgoCD ApplicationSets, Kustomize overlays, and centralized configuration management.

---

## Multi-Cluster Rook GitOps Architecture

Managing Rook-Ceph across multiple clusters requires a hub-and-spoke model:
- Central Git repository as the source of truth
- ArgoCD running on a management cluster (or in-cluster)
- Each target cluster registered in ArgoCD
- Environment-specific overlays in Git

## Repository Structure

```text
rook-multi-cluster/
  base/
    crds.yaml
    operator.yaml
    cluster.yaml
  clusters/
    us-east-prod/
      kustomization.yaml
      cluster-values.yaml
    eu-west-prod/
      kustomization.yaml
      cluster-values.yaml
    us-west-staging/
      kustomization.yaml
      cluster-values.yaml
```

## Registering Target Clusters in ArgoCD

```bash
argocd cluster add k8s-us-east-prod --name us-east-prod
argocd cluster add k8s-eu-west-prod --name eu-west-prod
argocd cluster add k8s-us-west-staging --name us-west-staging

# Label clusters for ApplicationSet selection
kubectl label secret cluster-us-east-prod \
  -n argocd \
  environment=production \
  region=us-east
```

## ApplicationSet for Multi-Cluster Deployment

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: rook-ceph-multicluster
  namespace: argocd
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          rook-enabled: "true"
  template:
    metadata:
      name: "rook-ceph-{{name}}"
      annotations:
        notifications.argoproj.io/subscribe.on-sync-failed.slack: rook-alerts
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/myorg/rook-multi-cluster
        targetRevision: HEAD
        path: "clusters/{{name}}"
      destination:
        server: "{{server}}"
        namespace: rook-ceph
      syncPolicy:
        automated:
          prune: false
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
        - ServerSideApply=true
```

## Cluster-Specific Configuration

```yaml
# clusters/us-east-prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- path: cluster-patch.yaml
  target:
    kind: CephCluster
configMapGenerator:
- name: cluster-info
  literals:
  - CLUSTER_REGION=us-east
  - CLUSTER_ENV=production
```

```yaml
# clusters/us-east-prod/cluster-patch.yaml
- op: replace
  path: /spec/storage/nodes
  value:
  - name: storage-us-east-1
    devices:
    - name: nvme0n1
  - name: storage-us-east-2
    devices:
    - name: nvme0n1
  - name: storage-us-east-3
    devices:
    - name: nvme0n1
```

## Centralized Monitoring Across Clusters

```bash
# View status of all Rook applications
argocd app list | grep rook-ceph

# Check health across all clusters
for app in $(argocd app list -o name | grep rook-ceph); do
  echo "=== $app ==="
  argocd app get $app --show-operation
done
```

## Summary

Multi-cluster Rook-Ceph management with GitOps uses ArgoCD ApplicationSets to generate per-cluster Applications from a single template. Kustomize overlays provide cluster-specific customization for node topology and device selection, while centralized ArgoCD monitoring gives a single pane of glass for all storage deployments.
