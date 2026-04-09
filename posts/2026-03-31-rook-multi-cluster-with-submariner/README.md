# How to Set Up Multi-Cluster Rook-Ceph with Submariner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Submariner, Multi-Cluster, Kubernetes, Federation

Description: Connect multiple Rook-Ceph clusters across Kubernetes clusters using Submariner for cross-cluster service discovery and RBD mirroring for disaster recovery.

---

## What Submariner Provides

Submariner creates secure tunnels between Kubernetes clusters, enabling cross-cluster pod-to-pod connectivity and service discovery. For Rook-Ceph, this enables RBD mirroring between clusters in different data centers for disaster recovery.

## Install Submariner

```bash
# Install the subctl CLI
curl -Ls https://get.submariner.io | bash
export PATH=$PATH:~/.local/bin

# Deploy Submariner broker (on the primary cluster)
subctl deploy-broker --kubeconfig /path/to/primary-kubeconfig

# Join cluster 1 (primary)
subctl join broker-info.subm \
  --kubeconfig /path/to/cluster1-kubeconfig \
  --clusterid cluster1

# Join cluster 2 (secondary)
subctl join broker-info.subm \
  --kubeconfig /path/to/cluster2-kubeconfig \
  --clusterid cluster2
```

## Verify Connectivity

```bash
# Check Submariner gateway status
subctl show connections --kubeconfig /path/to/cluster1-kubeconfig

# Verify cross-cluster service resolution
subctl verify --kubeconfig /path/to/cluster1-kubeconfig \
              --toconfig /path/to/cluster2-kubeconfig \
              --only service-discovery,connectivity
```

## Configure RBD Mirroring

Enable mirroring on both clusters:

```yaml
# Cluster 1 - Primary
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    peers:
      secretNames:
        - rbd-primary-site-secret
```

## Exchange Bootstrap Tokens

```bash
# On cluster 1, get the bootstrap token
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap create \
  --site-name cluster1 replicated-pool > /tmp/cluster1-token.txt

# On cluster 2, import the token (pipe via stdin using '-')
kubectl -n rook-ceph exec -i deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap import \
  --site-name cluster2 \
  --direction rx-tx \
  replicated-pool - < /tmp/cluster1-token.txt
```

## Expose Ceph Services via ServiceExport

```yaml
# Export the Ceph RGW service for cross-cluster access
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: rook-ceph-rgw-my-store
  namespace: rook-ceph
```

## Check Mirroring Status

```bash
# On cluster 1
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool status replicated-pool

# Expected output: health OK, all images syncing/replaying
```

## Failover to Secondary Cluster

```bash
# In a disaster scenario, promote images on secondary cluster
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror image promote --force replicated-pool/myimage

# Redirect application PVCs to the secondary cluster's storage class
```

## Summary

Submariner enables Rook-Ceph multi-cluster deployments by providing cross-cluster network connectivity for RBD mirroring. This architecture supports disaster recovery scenarios where applications can fail over to a secondary cluster with up-to-date replicated storage. Service exports make cross-cluster Ceph endpoints discoverable through standard Kubernetes DNS.
