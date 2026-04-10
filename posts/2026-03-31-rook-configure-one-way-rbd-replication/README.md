# How to Configure One-Way RBD Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Replication

Description: Learn how to configure one-way RBD mirroring in Rook-Ceph to replicate block volumes from a primary cluster to a secondary disaster recovery site.

---

## One-Way RBD Replication Overview

One-way RBD replication (also called one-way mirroring) continuously replicates RBD images from a primary Ceph cluster to a secondary cluster. The secondary site holds a read-only replica that can be promoted to primary in a disaster recovery scenario.

This is the most common DR configuration for Rook-Ceph deployments because:
- Simpler to configure and reason about than two-way mirroring
- The secondary does not need the same capacity as the primary
- Clear role designation prevents split-brain scenarios

## Prerequisites

- Two Rook-Ceph clusters (primary and secondary)
- Network connectivity between both clusters
- The `rbd-mirror` daemon deployed on at least one site

## Step 1 - Enable Mirroring on the Primary Pool

On the primary cluster, enable mirroring on the pool:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph osd pool create replicapool 128 replicated

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool enable replicapool pool
```

## Step 2 - Enable Mirroring on the Secondary Pool

On the secondary cluster, enable mirroring on the corresponding pool:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror pool enable replicapool pool
```

## Step 3 - Generate and Exchange Bootstrap Tokens

On the primary cluster, generate a bootstrap token:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool peer bootstrap create \
  --site-name primary replicapool > /tmp/primary-bootstrap-token.txt
```

Import the primary token into the secondary cluster:

```bash
BOOTSTRAP_TOKEN=$(cat /tmp/primary-bootstrap-token.txt)
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror pool peer bootstrap import \
  --site-name secondary \
  --direction rx-only \
  replicapool "${BOOTSTRAP_TOKEN}"
```

The `--direction rx-only` flag ensures this is one-way replication (secondary receives only).

## Step 4 - Deploy the rbd-mirror Daemon via Rook

On the secondary cluster, deploy `rbd-mirror` using the Rook CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: my-rbd-mirror
  namespace: rook-ceph
spec:
  count: 1
  peers:
    secretNames:
    - rbd-primary-peer-token
```

## Step 5 - Enable Mirroring on Individual Images

If using image-level mirroring mode, enable on specific images:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image enable replicapool/myimage snapshot
```

## Step 6 - Verify Replication Status

Check the mirror status on the secondary cluster:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror pool status replicapool
```

```text
health: OK
images: 5 total
    5 replaying
```

## Summary

One-way RBD replication in Rook-Ceph replicates images from primary to secondary using the `--direction rx-only` bootstrap token. The secondary holds a read-only replica and images cannot be promoted without manual intervention during failover. This mode is the recommended starting point for DR configurations, providing a clean replica at the secondary site with minimal operational complexity.
