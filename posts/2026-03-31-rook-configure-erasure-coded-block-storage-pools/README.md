# How to Configure Erasure Coded Block Storage Pools in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Erasure Coding, Block Storage, CephBlockPool, Kubernetes, Storage

Description: Configure erasure-coded block storage pools in Rook-Ceph to achieve higher usable capacity than replication while maintaining fault tolerance across OSDs.

---

## Why Use Erasure Coding for Block Storage

Erasure coding (EC) splits data into k data chunks and m coding chunks, storing them across k+m OSDs. For example, a 4+2 profile uses four data shards and two parity shards, tolerating two simultaneous OSD failures while consuming only 1.5x the raw data size compared to 3x for three-way replication. EC is ideal for large-volume workloads where raw capacity efficiency matters more than the lowest possible read latency.

## Prerequisites for EC Block Storage

RBD volumes backed by erasure-coded pools require the kernel `rbd` module to support the `object-map` and `fast-diff` image features, and the client kernel must be v4.11 or later for full EC support. Check the running kernel:

```bash
uname -r
```

## Creating an Erasure-Coded Profile

Before creating the pool, define a named EC profile:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd erasure-code-profile set my-ec-profile \
    k=4 m=2 crush-failure-domain=host
```

View the profile:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd erasure-code-profile get my-ec-profile
```

## Configuring an EC Block Pool via CephBlockPool CRD

Rook supports EC block pools through the `erasureCoded` spec section. You must also provide a companion replicated metadata pool because RBD requires a replicated pool for its metadata objects:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-block-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
```

Rook automatically creates an associated replicated metadata pool named `ec-block-pool-metadata` when you use EC for block storage.

## StorageClass for the EC Pool

Reference the EC pool in a StorageClass. The `pool` parameter points to the replicated metadata pool while `dataPool` points to the EC pool used for data:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-ec
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: ec-block-pool-metadata
  dataPool: ec-block-pool
  imageFormat: "2"
  imageFeatures: layering,object-map,fast-diff,deep-flatten
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## OSD Count Requirements

For a 4+2 profile with `crush-failure-domain=host`, you need at least six hosts each with at least one OSD. Verify OSD distribution:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df tree
```

If you have fewer failure domains than k+m, pool creation will fail with a CRUSH rule error. Adjust the profile's `crush-failure-domain` to `osd` for smaller clusters at the cost of losing host-level fault tolerance.

## Fast Read Mode

Enable `fast-read` to allow reads from any shard rather than waiting for the primary:

```yaml
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  parameters:
    fast_read: "1"
```

This reduces read latency for sequential workloads by spreading read I/O across more OSDs.

## Comparing EC Profiles

| Profile | Raw Overhead | Max Failures | Min Hosts |
|---|---|---|---|
| 2+1 | 1.5x | 1 | 3 |
| 4+2 | 1.5x | 2 | 6 |
| 8+3 | 1.375x | 3 | 11 |
| 4+1 | 1.25x | 1 | 5 |

Choose the profile that matches your cluster size and durability requirements.

## Summary

Erasure-coded block pools in Rook-Ceph provide better raw capacity efficiency than replication by splitting data into shards distributed across multiple OSDs. Define the EC profile via the toolbox, specify `erasureCoded.dataChunks` and `codingChunks` in the CephBlockPool spec, and ensure your cluster has enough hosts to satisfy the failure domain requirements. Pair the pool with a StorageClass that enables the necessary RBD image features for full EC compatibility.
