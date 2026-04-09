# How to Use VolumeReplication CRDs for RBD DR in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Disaster Recovery, VolumeReplication, Kubernetes

Description: Learn how to configure VolumeReplication CRDs in Rook-Ceph for RBD disaster recovery, enabling asynchronous replication between clusters.

---

## Overview

Rook integrates with the CSI Addons project to expose `VolumeReplication` and `VolumeReplicationClass` CRDs. These CRDs allow you to configure asynchronous RBD mirroring at the volume level, enabling disaster recovery (DR) between two Ceph clusters or two Rook deployments in separate Kubernetes clusters.

## Architecture

A typical RBD DR setup consists of:

- **Primary site** - The active cluster where workloads run
- **Secondary site** - The standby cluster that receives asynchronous replicas
- Both clusters need RBD mirroring enabled and a peer relationship established

## Prerequisites

- Rook operator with CSI Addons enabled on both clusters
- RBD mirroring enabled on both Ceph clusters
- `imageFeatures` must include `exclusive-lock` for mirrored images (journal-based mirroring additionally requires `journaling`; snapshot-based mirroring does not)

## Enable RBD Mirroring on the Pool

On both clusters, enable mirroring for the block pool:

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
      - interval: 1h
        startTime: "00:00:00-00:00"
```

## Bootstrap the Mirroring Peer

On the primary cluster, generate the bootstrap token:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap create --site-name primary replicapool
```

Copy the token and import it on the secondary cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd mirror pool peer bootstrap import \
  --site-name secondary \
  --direction rx-only \
  replicapool <bootstrap-token>
```

## Create a VolumeReplicationClass

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplicationClass
metadata:
  name: rook-volumereplicationclass
spec:
  provisioner: rook-ceph.rbd.csi.ceph.com
  parameters:
    mirroringMode: snapshot
    schedulingInterval: 1h
    schedulingStartTime: "00:00:00-00:00"
    replication.storage.openshift.io/replication-secret-name: rook-csi-rbd-provisioner
    replication.storage.openshift.io/replication-secret-namespace: rook-ceph
```

## Create a VolumeReplication Resource

Enable replication for a specific PVC:

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplication
metadata:
  name: my-volume-replication
  namespace: default
spec:
  volumeReplicationClass: rook-volumereplicationclass
  replicationState: primary
  dataSource:
    apiGroup: ""
    kind: PersistentVolumeClaim
    name: my-pvc
```

Apply it:

```bash
kubectl apply -f volume-replication.yaml
```

## Check Replication Status

```bash
kubectl get volumereplication my-volume-replication -o yaml
```

Look for the status conditions showing replication health:

```text
status:
  state: Primary
  message: volume is marked primary
  conditions:
    - type: Completed
      status: "True"
      reason: Promoted
    - type: Degraded
      status: "False"
      reason: Healthy
    - type: Resyncing
      status: "False"
      reason: NotResyncing
```

## Failover to Secondary Site

To promote the secondary site during a DR event, change `replicationState` to `secondary` on primary (if accessible), then on the secondary cluster:

```yaml
spec:
  replicationState: primary
```

```bash
kubectl apply -f volume-replication-secondary.yaml
```

## Summary

Rook VolumeReplication CRDs integrate with CSI Addons to provide declarative RBD mirroring for disaster recovery. By defining a `VolumeReplicationClass` and attaching `VolumeReplication` objects to PVCs, you get snapshot-based asynchronous replication between clusters. Failover involves promoting the secondary site by changing the `replicationState`, making it straightforward to automate with tools like Submariner or RHACM.
