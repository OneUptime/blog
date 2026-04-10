# How to Configure CephFS Client Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Client, Configuration

Description: Learn how to configure CephFS client settings including cache limits, readahead, and timeout values to optimize performance in Rook-Ceph deployments.

---

## Overview

CephFS clients expose a wide range of tuneable settings that affect performance, reliability, and resource usage. These settings can be configured via `ceph.conf`, mount options (kernel driver), or command-line flags (`ceph-fuse`). Understanding and tuning these settings is critical for production workloads with diverse I/O patterns.

## Kernel Client Settings via Mount Options

The kernel CephFS driver accepts settings as mount options:

```bash
mount -t ceph 192.168.1.10:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/ceph.client.admin.keyring,\
rsize=16777216,wsize=16777216,rasize=8388608
```

Common kernel mount options:

```text
rsize=N       - Read size in bytes (default: 16MB, max: 64MB)
wsize=N       - Write size in bytes (default: 16MB, max: 64MB)
rasize=N      - Readahead size in bytes
noatime       - Do not update access time on reads
nodiratime    - Do not update directory access time
ms_mode=X     - Messenger mode (legacy, crc, secure, prefer-crc, prefer-secure)
```

## FUSE Client Settings via ceph.conf

For `ceph-fuse`, settings are typically placed in `/etc/ceph/ceph.conf` under `[client]`:

```text
[client]
client_cache_size = 65536
client_cache_mid = 0.75
client_readahead_max_bytes = 33554432
client_reconnect_stale = true
fuse_big_writes = true
fuse_max_write = 16777216
```

## Key Configuration Parameters

### Cache Settings

```bash
# Set the maximum number of inodes the client can cache
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_cache_size 65536

# Set the readahead maximum (bytes)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_max_bytes 33554432
```

### Timeout Settings

```bash
# Timeout for the CephFS mount operation (seconds)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_mount_timeout 300

# Whether to reconnect automatically when the session becomes stale
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_reconnect_stale true
```

### Write Settings

```bash
# Maximum size of a single write operation (FUSE client)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client fuse_max_write 16777216
```

## Apply Settings Per-Mount with Rook CSI

In Rook, client mount settings are passed through StorageClass `mountOptions` or ceph-csi-specific parameters:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-fast
provisioner: rook-ceph.cephfs.csi.ceph.com
mountOptions:
  - noatime
  - rsize=16777216
  - wsize=16777216
parameters:
  clusterID: rook-ceph
  fsName: cephfs
  pool: cephfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## Summary

CephFS client settings control how the client caches metadata and data, handles reconnection, and sizes I/O operations. Tuning `rsize`, `wsize`, `rasize`, and cache parameters can significantly improve throughput for sequential workloads while `noatime` reduces unnecessary write traffic. In Rook-Ceph deployments, these settings can be applied via `ceph.conf`, mount options, or StorageClass parameters depending on whether you use the kernel driver or FUSE client.
