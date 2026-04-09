# How to Set Up RBD Persistent Read-Only Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Cache, Performance

Description: Learn how to configure RBD persistent read-only cache in Ceph to accelerate block device reads using local NVMe or SSD storage in Rook-Ceph.

---

## What Is RBD Persistent Read-Only Cache

The RBD persistent read-only cache (also called the immutable object cache or parent cache) stores a local copy of read-only parent image data on fast local storage. It is most useful when:

- Many cloned RBD images share the same parent
- The parent image data is frequently read but rarely written
- Local NVMe storage is available on compute nodes

When a read hits cached data, it is served from local disk instead of traversing the network to Ceph OSDs, significantly reducing read latency.

## Step 1 - Understand the Cache Architecture

The persistent read-only cache works with the `ceph-immutable-object-cache` daemon, which runs on each node that mounts RBD images. The daemon intercepts read requests for parent image objects and serves them from a local cache directory.

The cache works with cloned RBD images that use the `layering` feature. The parent image must be protected as a snapshot before cloning.

## Step 2 - Configure the Cache Daemon

Create the cache configuration in `/etc/ceph/ceph.conf` on each node:

```text
[client]
rbd parent cache enabled = true
rbd plugins = parent_cache
immutable_object_cache_path = /mnt/nvme/rbd-cache
immutable_object_cache_max_size = 10737418240
```

For Rook-managed nodes, inject this via a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client]
    rbd parent cache enabled = true
    rbd plugins = parent_cache
    immutable_object_cache_path = /mnt/nvme/rbd-cache
    immutable_object_cache_max_size = 10737418240
```

## Step 3 - Deploy the Cache Daemon as a DaemonSet

Run the `ceph-immutable-object-cache` daemon on every node that uses RBD:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-immutable-object-cache
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-immutable-object-cache
  template:
    metadata:
      labels:
        app: ceph-immutable-object-cache
    spec:
      containers:
      - name: cache
        image: quay.io/ceph/ceph:v18.2.0
        command: ["ceph-immutable-object-cache", "-f"]
        volumeMounts:
        - name: cache-dir
          mountPath: /mnt/nvme/rbd-cache
        - name: ceph-config
          mountPath: /etc/ceph
      volumes:
      - name: cache-dir
        hostPath:
          path: /mnt/nvme/rbd-cache
          type: DirectoryOrCreate
      - name: ceph-config
        configMap:
          name: rook-ceph-config
```

## Step 4 - Verify Cache Is Active

Check that the daemon connects to the Ceph cluster:

```bash
kubectl logs -n rook-ceph daemonset/ceph-immutable-object-cache | grep -i "cache"
```

Confirm that RBD images report cache hits:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd perf image iostat replicapool
```

## Step 5 - Tune Cache Size and Eviction

Adjust cache size based on available NVMe space and working set size:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set client immutable_object_cache_max_size 21474836480
```

## Summary

RBD persistent read-only cache in Rook-Ceph accelerates read operations by caching parent image objects on local NVMe or SSD storage. Deploy the `ceph-immutable-object-cache` daemon as a DaemonSet, configure the cache path and size via a Rook ConfigMap override, and verify cache activity through the RBD perf iostat output. This approach is most effective for clone-heavy workloads where many VMs or containers share a common base image.
