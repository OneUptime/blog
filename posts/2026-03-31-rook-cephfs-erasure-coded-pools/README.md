# How to Configure Erasure Coded Data Pools for CephFS in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Erasure Coding, Storage

Description: Learn how to configure erasure coded data pools for CephFS in Rook, balancing storage efficiency with data protection across OSD failure domains.

---

## Erasure Coding in CephFS

CephFS uses two pools: a metadata pool and a data pool. By default both are replicated. However, the data pool can be configured as an erasure coded (EC) pool to achieve higher storage efficiency. EC uses a `k+m` coding scheme where `k` data chunks and `m` parity chunks are spread across OSDs. This means you can tolerate `m` OSD failures while using less raw storage than full replication.

For example, `k=4, m=2` (erasure profile `4+2`) stores data in 6 chunks and tolerates 2 OSD failures, using 1.5x the raw data size compared to 3x for triple replication.

Important: The metadata pool must always be replicated. Only the data pool supports erasure coding.

## Creating an Erasure Coding Profile

When using the CephFilesystem CRD (shown below), Rook automatically creates and manages the EC profile from the `erasureCoded` settings. Manual profile creation is only needed if you require a custom profile with specific plugin or technique settings. To create one manually via the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
ceph osd erasure-code-profile set myec-profile k=4 m=2 plugin=jerasure technique=reed_sol_van
ceph osd erasure-code-profile get myec-profile
```

## Creating CephFS with an EC Data Pool

For CephFS, the EC data pool is defined inline in the CephFilesystem CRD's `dataPools` field. Note that `CephBlockPool` is a separate resource type used for RBD block storage and is not needed for CephFS data pools.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: ec-data
      failureDomain: host
      erasureCoded:
        dataChunks: 4
        codingChunks: 2
  metadataServer:
    activeCount: 1
    activeStandby: true
```

After applying, confirm both pools are created:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs ls
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail | grep -E "ec|myfs"
```

## Requirements for EC Data Pools

EC pools require more OSDs than replicated pools. A `k+m` profile needs at least `k+m` OSDs in the failure domain. For `4+2`, you need at least 6 hosts (with `failureDomain: host`).

EC pools also have performance implications - writes must update parity chunks, making small random writes slower. CephFS EC data pools are best suited for large file workloads like media storage or backups.

## Creating a StorageClass for the EC Filesystem

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-ec
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-ec-data
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Summary

Erasure coded data pools for CephFS in Rook provide storage efficiency gains over replicated pools - typically 40-50% less raw capacity for comparable fault tolerance. The metadata pool must remain replicated. Define the EC data pool inline in the CephFilesystem CRD's `dataPools` field with `erasureCoded` settings. Rook automatically creates the underlying Ceph pool and EC profile. Ensure your cluster has enough OSDs to satisfy the `k+m` requirement before enabling EC.
