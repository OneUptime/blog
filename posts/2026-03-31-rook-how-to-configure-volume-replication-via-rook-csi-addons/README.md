# How to Configure Volume Replication via Rook CSI-Addons

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Volume Replication, Csi Addons, Kubernetes, Disaster Recovery

Description: Configure asynchronous volume replication using Rook CSI-Addons VolumeReplication CRDs to protect PVC data with snapshot-based mirroring between clusters.

---

## Overview

The Rook CSI-Addons project provides `VolumeReplication` and `VolumeReplicationClass` CRDs that enable declarative configuration of RBD mirroring for persistent volumes. This allows platform teams to set up disaster recovery for individual PVCs without understanding the underlying Ceph mirroring mechanics.

## Architecture Overview

Volume replication in Rook uses:

- **VolumeReplicationClass** - Defines the replication driver, schedule, and parameters
- **VolumeReplication** - Associates a specific PVC with a replication class and sets the replication role (Primary/Secondary)

## Prerequisites

- RBD mirroring enabled on both Ceph clusters (peer relationship established)
- CSI-Addons operator installed on both Kubernetes clusters
- StorageClass using `imageFeatures: layering,exclusive-lock`

## Step 1 - Create a StorageClass with Mirroring Features

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-mirrored
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Step 2 - Create a VolumeReplicationClass

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplicationClass
metadata:
  name: rbd-replication-class-1h
spec:
  provisioner: rook-ceph.rbd.csi.ceph.com
  parameters:
    mirroringMode: snapshot
    schedulingInterval: 1h
    schedulingStartTime: "00:00:00-00:00"
    replication.storage.openshift.io/replication-secret-name: rook-csi-rbd-provisioner
    replication.storage.openshift.io/replication-secret-namespace: rook-ceph
```

Apply it:

```bash
kubectl apply -f volumereplicationclass.yaml
```

## Step 3 - Enable Replication for a PVC

On the primary cluster, create a `VolumeReplication` for a specific PVC:

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplication
metadata:
  name: replicate-my-db-pvc
  namespace: production
spec:
  volumeReplicationClass: rbd-replication-class-1h
  replicationState: primary
  dataSource:
    kind: PersistentVolumeClaim
    apiGroup: ""
    name: my-database-pvc
```

Apply it:

```bash
kubectl apply -f volumereplication.yaml
```

## Step 4 - Check Replication Status

```bash
kubectl get volumereplication replicate-my-db-pvc -n production -o yaml
```

Look for the `Completed` condition:

```text
status:
  state: Primary
  lastCompletionTime: "2026-03-31T09:00:00Z"
  lastStartTime: "2026-03-31T08:00:00Z"
  conditions:
    - type: Completed
      status: "True"
      reason: Scheduled
    - type: Degraded
      status: "False"
    - type: Resyncing
      status: "False"
```

## Step 5 - Configure Secondary Site

On the secondary Kubernetes cluster, create the corresponding `VolumeReplication` in secondary mode:

```yaml
apiVersion: replication.storage.openshift.io/v1alpha1
kind: VolumeReplication
metadata:
  name: replicate-my-db-pvc
  namespace: production
spec:
  volumeReplicationClass: rbd-replication-class-1h
  replicationState: secondary
  dataSource:
    kind: PersistentVolumeClaim
    apiGroup: ""
    name: my-database-pvc
```

## Failover Procedure

To promote the secondary site:

1. Set the primary `VolumeReplication` to `Secondary` state (or if primary is unavailable, skip this step)
2. Set the secondary `VolumeReplication` to `Primary` state:

```yaml
spec:
  replicationState: primary
```

3. Start your application on the secondary cluster

## Resync After Failback

After recovering the primary cluster, resync by setting `replicationState: resync` temporarily:

```yaml
spec:
  replicationState: resync
```

Then set it back to `secondary` once sync completes.

## Summary

Rook CSI-Addons `VolumeReplication` CRDs provide a declarative, Kubernetes-native way to configure RBD snapshot-based mirroring for individual PVCs. Create a `VolumeReplicationClass` with your schedule, attach `VolumeReplication` objects to PVCs on both clusters, and control the primary/secondary role declaratively. Failover is as simple as changing `replicationState: primary` on the secondary cluster.
