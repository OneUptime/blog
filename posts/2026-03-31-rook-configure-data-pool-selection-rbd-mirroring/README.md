# How to Configure Data Pool Selection for RBD Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Storage Pool, Kubernetes

Description: Learn how to configure data pool selection for RBD mirroring in Ceph to control which storage pools are replicated across clusters.

---

## Overview

When configuring RBD mirroring, you can choose specific data pools to mirror rather than mirroring all pools. This gives you fine-grained control over replication scope, cost, and bandwidth usage. Data pool selection lets you designate which pool holds the actual block data for mirrored images.

## Understanding Pool Types in Ceph RBD

Ceph RBD uses two pool types in certain configurations:

- **Metadata pool** - stores image metadata, object map, and journal data
- **Data pool** - stores the actual block data (used with erasure coding or when specified explicitly)

```bash
# List available pools
ceph osd lspools

# Show pool details
ceph osd pool get replicapool all
```

## Enabling Mirroring on a Specific Pool

Enable mirroring only on the pools you want replicated:

```bash
# Enable pool-level mirroring
rbd mirror pool enable data-pool pool

# Verify mirroring is enabled
rbd mirror pool info data-pool
```

## Creating Images with a Specific Data Pool

When creating RBD images, explicitly specify the data pool to control where block data is stored:

```bash
# Create image using a separate data pool
rbd create --size 10G \
  --data-pool ec-data-pool \
  replicapool/myimage

# Verify the image data pool assignment
rbd info replicapool/myimage | grep "data_pool"
```

## Mirroring Images with Erasure-Coded Data Pools

Erasure-coded pools cannot be mirrored directly - you must use a replicated metadata pool with an EC data pool:

```bash
# Create EC pool for data
ceph osd pool create ec-data-pool erasure

# Allow EC overwrites (required for RBD on EC pools)
ceph osd pool set ec-data-pool allow_ec_overwrites true

# Enable RBD application on EC pool
rbd pool init ec-data-pool

# Create replicated pool for metadata
ceph osd pool create rbd-meta replicated

# Create an image spanning both pools
rbd create --size 50G \
  --data-pool ec-data-pool \
  rbd-meta/large-image
```

Enable mirroring on the metadata pool (journaling propagates to data pool automatically):

```bash
rbd mirror pool enable rbd-meta pool
```

## Rook CRD for Data Pool Selection

In Rook, configure a separate data pool for an RBD block pool:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rbd-metadata
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: image
---
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: rbd-ec-data
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
```

Reference the data pool in your StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-ec
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  pool: rbd-metadata
  dataPool: rbd-ec-data
  clusterID: rook-ceph
```

## Verifying Data Pool Configuration

```bash
# Check which data pool an image uses
rbd info rbd-metadata/myimage

# List all images with their data pools
rbd ls rbd-metadata | xargs -I{} rbd info rbd-metadata/{} | grep -E "^rbd image|data_pool"
```

## Summary

Data pool selection in RBD mirroring allows you to separate metadata from block data, enabling erasure-coded storage for large datasets while keeping mirroring functional via the replicated metadata pool. Rook supports this through the `dataPool` parameter in StorageClass definitions. Always enable mirroring on the metadata pool, not the EC data pool directly.
