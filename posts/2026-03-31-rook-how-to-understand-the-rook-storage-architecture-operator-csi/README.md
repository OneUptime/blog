# How to Understand the Rook Storage Architecture (Operator, CSI, Daemon Layers)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Architecture, CSI, Kubernetes Operator

Description: Learn how the Rook storage architecture is organized across the operator, CSI driver, and Ceph daemon layers, and how they interact to provide storage.

---

## Overview of the Three Layers

Rook-Ceph consists of three distinct functional layers:

1. **Rook Operator** - Kubernetes controller that manages Ceph cluster lifecycle
2. **CSI Drivers** - Kubernetes-native storage provisioning and attachment
3. **Ceph Daemons** - The actual distributed storage engine

```text
+----------------------------------+
|      Kubernetes Control Plane    |
|   (CephCluster, CephBlockPool,   |
|    CephFilesystem CRDs)          |
+------------------+---------------+
                   |
         +----------+---------+
         |                    |
+--------+-------+   +--------+-------+
|  Rook Operator |   |  CSI Drivers   |
|  (watches CRDs)|   | (RBD, CephFS)  |
+--------+-------+   +--------+-------+
         |                    |
+--------+--------------------+-------+
|                                     |
|         Ceph Daemons                |
|  MON  MGR  OSD  MDS  RGW           |
+-------------------------------------+
```

## Layer 1: The Rook Operator

The Rook operator is a Kubernetes controller (Deployment) that:
- Watches Ceph custom resources (CephCluster, CephBlockPool, etc.)
- Translates CRD specifications into Ceph cluster configuration
- Manages Ceph daemon lifecycle (creates/updates/deletes pods)
- Orchestrates upgrades, expansions, and failure recovery

```bash
# The operator runs as a single Deployment
kubectl -n rook-ceph get deploy rook-ceph-operator

# It watches all CRDs in its namespace
kubectl api-resources | grep ceph.rook.io
```

```text
cephblockpools          cephblockpool         ceph.rook.io/v1   true
cephclusters            cephcluster           ceph.rook.io/v1   true
cephfilesystems         cephfilesystem        ceph.rook.io/v1   true
cephobjectstores        cephobjectstore       ceph.rook.io/v1   true
cephnfs                 cephnfs               ceph.rook.io/v1   true
```

## Layer 2: CSI Drivers

The Container Storage Interface (CSI) drivers handle the Kubernetes storage integration:
- **RBD CSI driver**: provisions block storage (PVCs with `accessMode: ReadWriteOnce`)
- **CephFS CSI driver**: provisions shared filesystem storage (PVCs with `accessMode: ReadWriteMany`)

```bash
# CSI driver components
kubectl -n rook-ceph get pods | grep csi
```

```text
csi-cephfsplugin-provisioner-xxx   - Provisions CephFS PVCs
csi-cephfsplugin-yyy               - Attaches/mounts CephFS on nodes (DaemonSet)
csi-rbdplugin-provisioner-xxx      - Provisions RBD PVCs
csi-rbdplugin-yyy                  - Attaches/mounts RBD on nodes (DaemonSet)
```

The CSI provisioner runs as a Deployment (one per cluster), while the CSI node plugin runs as a DaemonSet on every node that might mount volumes.

## Layer 3: Ceph Daemons

Ceph daemons are the actual storage engine components:

```text
MON (Monitor)  - Maintains cluster map and quorum. Requires 3 or 5 for HA.
OSD            - Stores actual data on disk. One per device.
MGR (Manager)  - Provides metrics, dashboard, and orchestration hooks.
MDS            - Metadata server for CephFS (only needed for CephFS).
RGW            - RADOS Gateway - S3/Swift compatible object storage.
```

```bash
# View all Ceph daemon pods
kubectl -n rook-ceph get pods -o wide

# Typical pod list:
# rook-ceph-mon-a-xxx
# rook-ceph-mon-b-xxx
# rook-ceph-mon-c-xxx
# rook-ceph-mgr-a-xxx
# rook-ceph-osd-0-xxx
# rook-ceph-osd-1-xxx
# rook-ceph-mds-myfs-a-xxx (if CephFS is configured)
# rook-ceph-rgw-xxx        (if Object Store is configured)
```

## How a PVC Request Flows Through the Architecture

When an application requests a PersistentVolumeClaim:

```text
1. PVC created with StorageClass "rook-ceph-block"
      |
2. Kubernetes notifies CSI RBD provisioner
      |
3. CSI RBD provisioner calls Ceph RBD API (via MON/MGR)
      |
4. Ceph creates an RBD image on the specified pool
      |
5. CSI provisioner creates the PersistentVolume in Kubernetes
      |
6. Pod scheduled to node; CSI node plugin maps RBD image to the node
      |
7. Pod mounts the block device as a filesystem
```

## Component Communication

```text
Rook Operator -> Ceph daemons:
  - Uses the Ceph admin API (via MON and MGR sockets)
  - Reads/writes Ceph RADOS configuration objects

CSI drivers -> Ceph cluster:
  - RBD driver uses Ceph RBD API (librbd)
  - CephFS driver uses Ceph libcephfs
  - Authentication via Ceph keyrings (Kubernetes Secrets)

Ceph daemons -> each other:
  - MONs maintain quorum via Paxos protocol
  - OSDs communicate for data placement and replication
  - MDS communicates with OSDs for filesystem metadata storage
```

## The Rook Toolbox

The Rook toolbox pod provides access to Ceph CLI tools for debugging:

```bash
# Deploy the toolbox
kubectl apply -f toolbox.yaml

# Access Ceph CLI
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
ceph status
ceph osd tree
ceph df
rados ls -p replicapool
```

## Summary

The Rook-Ceph architecture has three layers: the Rook operator that watches CRDs and manages Ceph daemon lifecycle, the CSI drivers (RBD and CephFS) that integrate with Kubernetes storage provisioning, and the Ceph daemons (MON, OSD, MGR, MDS, RGW) that provide the actual distributed storage. PVC requests flow from Kubernetes through the CSI provisioner, through Ceph APIs, and ultimately result in RBD images or CephFS subvolumes being created and attached to pods.
