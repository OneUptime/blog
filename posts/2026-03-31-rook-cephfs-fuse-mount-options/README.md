# How to Configure CephFS FUSE Mount Options in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CephFS, FUSE, Storage

Description: Configure ceph-fuse mount options in Rook for CephFS volumes to enable features not available in the kernel client, including encryption and extended metadata capabilities.

---

## When to Use the FUSE Client

The CephFS kernel client is faster and lower-overhead for most workloads. The FUSE client (`ceph-fuse`) is preferred when:
- Your kernel version does not support all CephFS features you need
- You need fscrypt encryption at the directory level
- You are using OpenShift or a locked-down kernel environment
- You need MDS session tagging or custom debugging

## Enabling the FUSE Client in Rook CSI

Tell the CSI driver to use FUSE by setting the `fuseMountOptions` in the `CephCluster` CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  csi:
    cephfs:
      fuseMountOptions: "default_permissions,allow_other,kernel_cache,max_write=16777216"
```

You must also ensure the FUSE client is selected instead of the kernel client. Set this in the operator ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"
```

Setting `CSI_FORCE_CEPHFS_KERNEL_CLIENT` to `false` tells the CSI driver to use the FUSE client (`ceph-fuse`) instead of the kernel client for CephFS mounts.

## Common FUSE Mount Options

```text
Option                  | Effect
------------------------|---------------------------------------------------
default_permissions     | Enforce kernel-level permission checks
allow_other             | Allow users other than the mounter to access files
kernel_cache            | Use the kernel page cache (improves read performance)
max_write=N             | Maximum write size in bytes
max_read=N              | Maximum read size in bytes
auto_cache              | Enable attribute caching for mtime-based invalidation
```

## Tuning for Performance

FUSE is inherently slower than the kernel client due to context switches between userspace and kernel. Mitigate this with these options:

```yaml
fuseMountOptions: "kernel_cache,max_write=16777216,max_read=16777216"
```

`kernel_cache` is the most impactful single option - it routes reads through the Linux page cache rather than going to userspace on every access. Note that `big_writes` is no longer needed as a manual option: ceph-fuse automatically enables it when linked against libfuse2, and libfuse3 enables it by default.

## StorageClass Level FUSE Options

Mount options can also be set per-StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-fuse
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated
  mounter: "fuse"
  fuseMountOptions: "kernel_cache,allow_other,default_permissions"
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Verifying FUSE Mounts

Check whether a volume is mounted via FUSE or kernel on a node:

```bash
mount | grep ceph-fuse
```

FUSE mounts appear as:

```text
ceph-fuse on /var/lib/kubelet/pods/.../mount type fuse.ceph-fuse (rw,allow_other,default_permissions,...)
```

Kernel mounts use `type ceph` instead.

## Summary

FUSE mount options in Rook offer flexibility for environments where the CephFS kernel client is unavailable or insufficient. While FUSE has higher CPU overhead, tuning with `kernel_cache` and large `max_write` values closes much of the performance gap. Use FUSE selectively for specific workloads or nodes that require it, keeping the kernel client as the default for performance-sensitive deployments.
