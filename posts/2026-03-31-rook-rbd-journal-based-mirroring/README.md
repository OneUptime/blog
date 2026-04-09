# How to Configure RBD Journal-Based Mirroring in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Journal

Description: Learn how to configure RBD journal-based mirroring in Rook to asynchronously replicate block volumes between two Ceph clusters for disaster recovery.

---

## Overview

RBD journal-based mirroring records every write to an internal journal and replays those writes asynchronously to a secondary Ceph cluster. This provides a recoverable point-in-time replica of block volumes across clusters. Journal mode captures all write operations, making it well-suited for applications that require consistent, ordered replication. This guide walks through configuring journal-based mirroring in Rook.

## Prerequisites

You need two Rook-Ceph clusters - a primary and a secondary. Both clusters must run compatible Ceph versions and have network connectivity between their monitor endpoints.

## Step 1 - Enable Mirroring on the Pool

Mirroring must be enabled on the RBD pool on the primary cluster. Enable it via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool application enable replicapool rbd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool enable replicapool image
```

## Step 2 - Configure the CephBlockPool for Mirroring

Update the CephBlockPool CRD on the primary cluster to enable mirroring with journal mode:

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
```

```bash
kubectl apply -f replicapool-mirror.yaml
```

## Step 3 - Enable Journaling on Individual Images

For journal-based mirroring, enable journaling on each RBD image you want to replicate:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd feature enable replicapool/<image-name> journaling

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror image enable replicapool/<image-name> journal
```

## Step 4 - Exchange Bootstrap Tokens

The primary and secondary clusters need to exchange bootstrap tokens to authenticate the mirror daemon connection:

```bash
# On primary: create bootstrap token
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap create \
  --site-name primary replicapool > bootstrap-token.txt

# On secondary: import the bootstrap token
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap import \
  --site-name secondary \
  --direction rx-only \
  replicapool - < bootstrap-token.txt
```

## Step 5 - Deploy the CephRBDMirror Daemon

Ensure the rbd-mirror daemon is deployed on the secondary cluster:

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
```

## Step 6 - Verify Mirroring Status

Check that images are actively replicating with journal mode:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror image status replicapool/<image-name>

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool status replicapool
```

Look for `state: up+replaying` in the output. The `replay_lag` field shows how far behind the secondary is:

```text
state: up+replaying
  entries_behind_primary: 0
  replay_lag: 0s
```

## Summary

RBD journal-based mirroring in Rook provides ordered, consistent replication by recording all writes to a journal before replaying them to the secondary cluster. It requires enabling the `journaling` feature flag on individual images and deploying the CephRBDMirror daemon on the secondary. Journal mode has higher write amplification than snapshot-based mirroring but offers finer-grained recovery points and continuous replication rather than periodic snapshots.
