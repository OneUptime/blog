# How to Set Up Single-Node Ceph for Edge Locations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Edge Computing, Single Node, Kubernetes

Description: Learn how to deploy a functional single-node Rook-Ceph cluster for edge locations where only one server is available, with appropriate durability trade-offs.

---

Some edge locations have only a single server available. A single-node Ceph deployment sacrifices high availability in exchange for local persistent storage with Ceph's management interface. This is appropriate for non-critical edge workloads or scenarios where data is regularly synced to the core.

## Trade-offs of Single-Node Ceph

A single-node deployment means:
- No data redundancy (one OSD failure = data loss unless using erasure coding)
- No mon quorum failover (single mon, single point of failure)
- Still provides Ceph's management, S3-compatible API, and Kubernetes integration

## Deploying Single-Node Rook-Ceph

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 1
    allowMultiplePerNode: true
  mgr:
    count: 1
    allowMultiplePerNode: true
  dashboard:
    enabled: true
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: sdb
    - name: sdc
  resources:
    osd:
      requests:
        memory: "512Mi"
        cpu: "200m"
      limits:
        memory: "1Gi"
        cpu: "500m"
```

## Creating a Pool for Single-Node Use

With a single node, disable replication to avoid HEALTH_WARN:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: single-node-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 1
    requireSafeReplicaSize: false
  parameters:
    pg_num: "16"
```

Suppress expected health warnings:

```bash
ceph health mute POOL_NO_REDUNDANCY
ceph health mute TOO_FEW_OSDS
```

## Setting Up a StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-edge
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: single-node-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Backup Strategy for Single-Node

Since there is no redundancy, implement frequent backups:

```bash
# Create daily RBD snapshots
rbd snap create single-node-pool/myvolume@$(date +%Y%m%d)

# Export to external storage
rbd export single-node-pool/myvolume@$(date +%Y%m%d) /backup/vol-backup.img
```

## Recovering from OSD Failure

If the OSD fails on a single-node cluster:

```bash
# Remove failed OSD
ceph osd out osd.0
ceph osd purge 0 --yes-i-really-mean-it

# In Rook, delete the OSD pod to trigger recreation
kubectl -n rook-ceph delete pod rook-ceph-osd-0-xxxx
```

Data recovery depends on having a recent backup.

## Summary

Single-node Rook-Ceph is a valid deployment model for edge locations with one server. It requires setting pool replication to size 1, muting expected warnings, and compensating for the lack of redundancy with a robust backup strategy. This setup provides Ceph's rich management and API capabilities while accepting the availability trade-off inherent in single-node operation.
