# How to Size a Ceph Cluster for Block Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Block Storage, RBD, Capacity Planning, Kubernetes

Description: Learn how to size a Rook-Ceph cluster specifically for RBD block storage workloads powering Kubernetes PersistentVolumes with the right hardware and pool configuration.

---

## Overview

Ceph RBD (RADOS Block Device) is the most common storage type provisioned by Rook for Kubernetes PersistentVolumes. Block storage workloads span a wide range - from read-heavy analytics to write-intensive databases - and sizing requires balancing capacity, IOPS, and replication overhead. This guide focuses on RBD-specific sizing considerations.

## Block Storage Characteristics

```text
RBD workloads:
- Kubernetes PVCs (databases, stateful apps)
- Virtual machine disks
- Write amplification: 3x with default replication
- Typical access: random read/write (4K-256K)
- Latency-sensitive (databases need < 5ms)
```

## Capacity Calculation for RBD

RBD pools typically use replication rather than erasure coding. While Ceph does support RBD on EC pools (since Luminous) via the `allow_ec_overwrites` flag, replication is strongly recommended for latency-sensitive block storage workloads:

```text
Usable = Raw / replication_factor / overhead
Raw needed = Desired usable * 3 * 1.2

For 50TB usable block storage:
Raw = 50TB * 3 * 1.2 = 180TB raw
```

## Drive Type Selection

```yaml
Database PVCs:      NVMe (< 1ms latency, 500K+ IOPS)
General-purpose:    SSD (< 5ms latency, 50K-100K IOPS)
Dev/test PVCs:      HDD (< 50ms latency, 200 IOPS - cost effective)
```

## Sample Cluster for 50TB RBD Block Storage

```yaml
# 3 nodes, 8 SSDs each (4TB per SSD)
# Raw: 3 * 8 * 4TB = 96TB
# Usable (3x replicated): 96 / 3 / 1.2 = 26TB (add nodes to scale)

# Recommended for 50TB:
# 6 nodes * 8 * 4TB SSD = 192TB raw
# Usable: 192 / 3 / 1.2 = 53TB
```

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 3
  mgr:
    count: 2
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: "sdb"
    - name: "sdc"
    - name: "sdd"
    - name: "sde"
    - name: "sdf"
    - name: "sdg"
    - name: "sdh"
    - name: "sdi"
    config:
      osdsPerDevice: "1"
```

## CephBlockPool for RBD

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rbd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    compression_mode: aggressive
    compression_algorithm: snappy
```

## StorageClass Configuration

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: rbd-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Monitoring PVC Usage

```bash
# Check how much of the pool is used by PVCs
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df detail | grep rbd-pool

# List all RBD images (PVCs)
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd ls -p rbd-pool

# Check a specific PVC image
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd info rbd-pool/csi-vol-abc123
```

## Thin Provisioning and Overcommit

Ceph supports thin provisioning - PVCs consume space only as data is written:

```bash
# Create a 1TB PVC, but only 10GB used
kubectl get pvc my-pvc -o jsonpath='{.spec.resources.requests.storage}'
# 1Ti

# Actual space used (run inside the toolbox):
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd du rbd-pool/csi-vol-abc123
# PROVISIONED  USED
# 1 TiB        10 GiB
```

Monitor actual usage to avoid overprovisioning beyond what your raw capacity can support.

## Summary

Sizing Rook-Ceph for RBD block storage requires 3x replication factor overhead (replication is recommended over EC for RBD due to latency), drive selection matching the latency requirements of your workloads, and enabling thin provisioning monitoring to avoid overcommitting. A 6-node SSD cluster with 8 drives per node comfortably serves 50TB of RBD block storage while maintaining the fault tolerance needed for production Kubernetes PVCs.
