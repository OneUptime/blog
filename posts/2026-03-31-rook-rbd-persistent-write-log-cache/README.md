# How to Configure RBD Persistent Write Log Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Cache, Performance

Description: Learn how to configure RBD persistent write log (PWL) cache in Ceph to accelerate write operations using local PMEM or NVMe storage.

---

## What Is RBD Persistent Write Log Cache

The RBD Persistent Write Log (PWL) cache is a write-back cache that stores incoming writes in fast local storage (PMEM or NVMe) before flushing them asynchronously to the Ceph cluster. This dramatically reduces write latency for I/O-sensitive workloads like databases.

Key benefits:
- Write acknowledgment from local cache instead of waiting for Ceph OSD replication
- Batching and coalescing of small random writes before sending to Ceph
- Crash safety: the write log is persistent, so in-flight writes survive a client crash

## Step 1 - Choose Cache Media

PWL cache supports two storage backends:

- **PMEM (Persistent Memory)** - Lowest latency, uses `rwl` mode
- **SSD/NVMe** - Higher latency than PMEM but still much faster than Ceph OSD RTT, uses `ssd` mode

For NVMe-based caching on Kubernetes nodes, use the `ssd` mode.

## Step 2 - Configure the Cache via Rook ConfigMap

Set the cache configuration using the Rook config override:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client]
    rbd_plugins = pwl_cache
    rbd_persistent_cache_mode = ssd
    rbd_persistent_cache_path = /mnt/nvme/rbd-pwl-cache
    rbd_persistent_cache_size = 21474836480
    rbd_cache = true
    rbd_cache_size = 67108864
    rbd_cache_max_dirty = 50331648
    rbd_cache_target_dirty = 33554432
```

## Step 3 - Prepare the Cache Directory on Each Node

Ensure the cache directory exists on the host with appropriate permissions:

```bash
mkdir -p /mnt/nvme/rbd-pwl-cache
chmod 700 /mnt/nvme/rbd-pwl-cache
```

Use a DaemonSet init container to prepare the directory:

```yaml
initContainers:
- name: prepare-cache
  image: busybox
  command: ["sh", "-c", "mkdir -p /mnt/nvme/rbd-pwl-cache && chmod 700 /mnt/nvme/rbd-pwl-cache"]
  securityContext:
    privileged: true
  volumeMounts:
  - name: nvme
    mountPath: /mnt/nvme
```

## Step 4 - Enable Exclusive Lock on a Specific Image

The persistent write log cache requires the `exclusive-lock` feature on the RBD image. Enable it if not already set:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature enable replicapool/myimage exclusive-lock
```

## Step 5 - Verify Cache Activity

Check persistent cache status for an active image:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd status replicapool/myimage
```

Look for the `Persistent cache state` section, which shows allocated bytes, cached bytes, dirty bytes, and hit/miss statistics.

## Step 6 - Flush the Cache Manually

To force all dirty data to be written to Ceph before an operation like a snapshot:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd persistent-cache flush replicapool/myimage
```

## Step 7 - StorageClass Configuration

Configure the StorageClass to reference write log cache parameters:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-fast
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFeatures: layering,exclusive-lock,object-map,fast-diff,deep-flatten
  mounter: rbd
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## Summary

RBD Persistent Write Log cache in Rook-Ceph reduces write latency by buffering writes to local PMEM or NVMe before flushing to the Ceph cluster. Configure it via the Rook config override ConfigMap with the `pwl_cache` plugin, prepare cache directories on each node, and ensure `exclusive-lock` is enabled on images that benefit most. Use `rbd persistent-cache flush` before creating snapshots to ensure consistency.
