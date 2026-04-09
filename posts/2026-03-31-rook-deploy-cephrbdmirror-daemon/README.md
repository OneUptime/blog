# How to Deploy the CephRBDMirror Daemon in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirror, Daemon

Description: Learn how to deploy and configure the CephRBDMirror daemon in Rook to enable asynchronous RBD block volume replication between Ceph clusters.

---

## Overview

The CephRBDMirror daemon (`rbd-mirror`) is responsible for replicating RBD images between two Ceph clusters. In Rook, you deploy this daemon using the `CephRBDMirror` custom resource. The daemon runs on the secondary cluster and pulls updates from the primary, either via journal replay or snapshot transfer. This guide covers deploying, configuring, and verifying the CephRBDMirror daemon.

## Understanding the CephRBDMirror CRD

The `CephRBDMirror` CRD controls how many rbd-mirror daemon instances run and where they are placed. For most deployments, a single daemon instance is sufficient. For high availability, you can run two or more instances.

## Basic CephRBDMirror Deployment

Create a minimal CephRBDMirror resource on the secondary cluster:

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
kubectl -n rook-ceph get cephrbdmirror
```

## High Availability Mirror Deployment

Run two mirror daemon instances on separate nodes:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephRBDMirror
metadata:
  name: my-rbd-mirror
  namespace: rook-ceph
spec:
  count: 2
  placement:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - rook-ceph-rbd-mirror
          topologyKey: kubernetes.io/hostname
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      memory: 512Mi
```

## Verifying the Daemon is Running

After applying the CRD, confirm the daemon pod is running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-rbd-mirror
kubectl -n rook-ceph logs -l app=rook-ceph-rbd-mirror
```

Check the daemon status from the Ceph toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s | grep rbd-mirror

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph orch ps --daemon-type rbd-mirror
```

## Checking Peer Configuration

After exchanging bootstrap tokens between clusters, verify the peer is recognized:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool info replicapool
```

Expected output shows the peer site name and UUID:

```text
Mode: image
Site Name: secondary
Peers:
  UUID: <peer-uuid>
  Name: primary
  Mirror UUID: <mirror-uuid>
  Direction: rx-only
```

## Monitoring Mirror Daemon Health

Check the overall mirroring health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool status replicapool

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool status replicapool --verbose
```

Prometheus metrics are also available for the rbd-mirror daemon:

```text
ceph_rbd_mirror_snapshot_image_sync_bytes
ceph_rbd_mirror_snapshot_image_sync_time
ceph_rbd_mirror_replay_latency
```

## Updating the Mirror Daemon Count

Scale the mirror daemon count if needed:

```bash
kubectl -n rook-ceph patch cephrbdmirror my-rbd-mirror \
  --type merge -p '{"spec":{"count":2}}'
```

## Summary

Deploying the CephRBDMirror daemon in Rook is straightforward via the `CephRBDMirror` CRD. The daemon runs on the secondary cluster and pulls replicated data from the primary using either journal or snapshot mode. For production deployments, run at least two daemon instances with pod anti-affinity to ensure mirror continuity if a node fails. Always verify peer configuration and mirroring status after deployment before relying on it for disaster recovery.
