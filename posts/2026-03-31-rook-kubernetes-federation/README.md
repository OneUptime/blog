# How to Set Up Rook-Ceph with Kubernetes Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Federation, KubeFed, Multi-Cluster

Description: Use KubeFed or ArgoCD to federate Rook-Ceph configuration across multiple Kubernetes clusters for consistent storage policies and centralized management.

---

## Federation Options for Rook-Ceph

Kubernetes cluster federation allows managing multiple clusters from a single control plane. For Rook-Ceph, federation enables consistent storage class definitions, pool configurations, and policies across all clusters without manual per-cluster management.

## Option 1: KubeFed (Kubernetes Federation v2)

> **Note:** The KubeFed project has been retired and archived (April 2023). The repository was moved to `kubernetes-retired/kubefed`. Consider using ArgoCD (Option 2) for new deployments.

Install KubeFed:

```bash
# Add the KubeFed Helm repository
helm repo add kubefed-charts https://raw.githubusercontent.com/kubernetes-retired/kubefed/master/charts
helm repo update

# Install KubeFed
helm install kubefed kubefed-charts/kubefed \
  --namespace kube-federation-system \
  --create-namespace

# Join clusters
kubefedctl join cluster1 \
  --cluster-context cluster1 \
  --host-cluster-context cluster1

kubefedctl join cluster2 \
  --cluster-context cluster2 \
  --host-cluster-context cluster1
```

## Federate StorageClasses

```yaml
apiVersion: types.kubefed.io/v1beta1
kind: FederatedStorageClass
metadata:
  name: ceph-rbd
  namespace: kube-federation-system
spec:
  template:
    provisioner: rook-ceph.rbd.csi.ceph.com
    parameters:
      clusterID: rook-ceph
      pool: replicated-pool
      csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
      csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
      csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
      csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  placement:
    clusters:
      - name: cluster1
      - name: cluster2
```

## Option 2: ArgoCD ApplicationSet

ArgoCD is simpler and more widely adopted for Rook configuration federation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: rook-ceph-config
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: cluster1
            url: https://cluster1-api-server
          - cluster: cluster2
            url: https://cluster2-api-server
  template:
    metadata:
      name: "rook-ceph-config-{{cluster}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/rook-configs
        targetRevision: HEAD
        path: rook/base
      destination:
        server: "{{url}}"
        namespace: rook-ceph
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Centralized Pool Policy

```yaml
# rook/base/pool-policy.yaml
# Applied to all federated clusters
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    compression_mode: passive
    compression_algorithm: zstd
```

## Override Per-Cluster Settings

Use Kustomize overlays for cluster-specific differences:

```yaml
# rook/overlays/cluster1/kustomization.yaml
resources:
  - ../../base
patches:
  - patch: |-
      - op: replace
        path: /spec/replicated/size
        value: 2  # Only 2 replicas in cluster1 (dev environment)
    target:
      kind: CephBlockPool
      name: replicated-pool
```

## Monitor Federation Health

```bash
# Check that all clusters have consistent pool config
for ctx in cluster1 cluster2; do
  echo "=== $ctx ==="
  kubectl --context $ctx -n rook-ceph get cephblockpool -o wide
done
```

## Summary

Kubernetes federation for Rook-Ceph simplifies multi-cluster storage management by propagating consistent StorageClass, pool, and policy definitions from a central source. ArgoCD ApplicationSets with Kustomize overlays provide a practical, GitOps-friendly approach, while KubeFed offers native federation primitives for teams already invested in that ecosystem.
