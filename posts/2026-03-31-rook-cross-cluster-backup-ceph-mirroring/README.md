# How to Set Up Cross-Cluster Backup with Ceph Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Mirroring, Backup, Disaster Recovery, RBD, Cross-Cluster

Description: Configure Ceph RBD mirroring between two Rook-Ceph clusters to replicate block storage volumes asynchronously for cross-cluster backup and disaster recovery.

---

## Overview

Ceph RBD mirroring replicates RBD images between two Ceph clusters, providing asynchronous cross-cluster backup. In Rook, this is configured using the CephBlockPool and CephRBDMirror resources. This enables disaster recovery with RPO bounded by your snapshot schedule interval.

## Architecture

Primary cluster continuously mirrors changed blocks to a secondary cluster. On failure, you can promote images on the secondary cluster to take over. The mirror operates asynchronously and can work across geographic locations.

## Step 1 - Enable Mirroring on the Primary Cluster Pool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
    snapshotSchedules:
      - interval: 24h
        startTime: "00:00:00-05:00"
```

```bash
kubectl apply -f pool-mirroring.yaml
```

## Step 2 - Deploy the RBD Mirror Daemon on Primary

```yaml
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: my-rbd-mirror
  namespace: rook-ceph
spec:
  count: 1
```

```bash
kubectl apply -f rbd-mirror.yaml
kubectl -n rook-ceph get pod -l app=rook-ceph-rbd-mirror
```

## Step 3 - Extract Bootstrap Token from Primary

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool info replicapool --all

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap create \
  --site-name=primary replicapool > /tmp/bootstrap-token.txt

cat /tmp/bootstrap-token.txt
```

## Step 4 - Configure Secondary Cluster

On the secondary cluster, enable mirroring on its pool and import the token:

```bash
# Copy bootstrap token to secondary cluster
kubectl create secret generic rbd-primary-site-secret \
  --namespace rook-ceph \
  --from-file=token=/tmp/bootstrap-token.txt \
  --from-literal=pool=replicapool
```

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
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

## Step 5 - Enable Mirroring on Individual Images

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror image enable replicapool/myimage snapshot

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror image status replicapool/myimage
```

## Step 6 - Monitor Mirroring Status

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool status replicapool --verbose
```

Output shows each image's sync state:

```yaml
health: OK
images: 5 total
  5 replaying
```

## Step 7 - Failover to Secondary

On failover, promote the secondary images:

```bash
# On secondary cluster
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror image promote --force replicapool/myimage
```

## Summary

Ceph RBD mirroring provides asynchronous cross-cluster replication that serves as both a backup and disaster recovery mechanism. Rook simplifies the configuration through CephBlockPool mirroring settings and the CephRBDMirror daemon. With snapshot-based mirroring, data transfer is efficient and the RPO is bounded by your snapshot schedule interval.
