# How to Configure Two-Way RBD Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Replication

Description: Learn how to configure two-way RBD mirroring in Rook-Ceph so both clusters can act as primary or secondary with active-active or active-passive replication.

---

## Two-Way RBD Replication Overview

Two-way RBD mirroring allows both clusters to replicate to each other. Unlike one-way mirroring, either cluster can serve as the primary for different images, enabling:

- Active-active workload distribution across two clusters
- Seamless failover and failback without re-seeding data
- Bidirectional disaster recovery

Two-way mirroring requires careful management to avoid split-brain scenarios where both clusters think they own the same image.

## Step 1 - Enable Mirroring on Both Clusters

Enable pool-level mirroring on both the primary and secondary clusters:

```bash
# On primary
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool enable replicapool pool

# On secondary
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror pool enable replicapool pool
```

## Step 2 - Generate Bootstrap Token

Generate a bootstrap token on site-a (primary):

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool peer bootstrap create \
  --site-name site-a replicapool > /tmp/bootstrap-token.txt
```

## Step 3 - Import Token on the Peer Site

Import the token on site-b. The default `--direction rx-tx` establishes bidirectional peering with a single import:

```bash
cat /tmp/bootstrap-token.txt | kubectl exec -i deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror pool peer bootstrap import \
  --site-name site-b \
  --direction rx-tx \
  replicapool -
```

The `-` at the end tells the command to read the token from stdin.

## Step 4 - Deploy rbd-mirror Daemons on Both Sites

Configure the CephBlockPool with mirroring peers on both clusters:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  mirroring:
    enabled: true
    mode: pool
    peers:
      secretNames:
        - rbd-peer-token
```

Deploy the mirror daemon on both clusters:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: rbd-mirror
  namespace: rook-ceph
spec:
  count: 1
```

Apply both resources on each cluster.

## Step 5 - Assign Images to Specific Primary Sites

In two-way mirroring, each image has a primary site. Assign images to site-a:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image enable replicapool/myimage snapshot

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image status replicapool/myimage
```

## Step 6 - Verify Bidirectional Sync

Check mirror status from each site:

```bash
# From site-a
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool status replicapool --verbose

# From site-b
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph-secondary -- \
  rbd mirror pool status replicapool --verbose
```

```text
health: OK
images: 10 total
    5 primary
    5 replaying
```

## Step 7 - Preventing Split-Brain

Enforce that each image has only one primary at a time. Use application-level coordination to ensure only the primary site's application is writing to a given image. Monitor with:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image status replicapool/myimage | grep primary
```

## Summary

Two-way RBD mirroring in Rook-Ceph enables bidirectional replication by importing a bootstrap token with `rx-tx` direction and deploying `rbd-mirror` on both clusters. Each image has a designated primary site, with the other site holding a read-only replica. This setup supports both active-active workload distribution and seamless failover without re-seeding, but requires careful application-level coordination to prevent split-brain.
