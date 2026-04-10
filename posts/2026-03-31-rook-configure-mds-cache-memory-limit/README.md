# How to Configure MDS Cache Memory Limit in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Memory, Performance, Kubernetes

Description: Learn how to configure the CephFS MDS cache memory limit to improve metadata performance while preventing OOM kills in Kubernetes environments.

---

## Understanding MDS Cache

The Ceph Metadata Server (MDS) maintains an in-memory cache of filesystem metadata including directory entries, inode information, and file attributes. A larger cache means fewer reads from the metadata pool, resulting in lower latency for metadata-intensive workloads like directory listings and file lookups.

By default, the MDS cache limit is 4GB. In memory-constrained environments this can cause OOM kills, while on memory-rich nodes you may want to increase it for better performance.

## Setting the MDS Cache Memory Limit

Rook automatically derives `mds_cache_memory_limit` from the pod's Kubernetes memory resource limit. You control it by setting `resources.limits.memory` on the `metadataServer` spec:

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
  - replicated:
      size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        memory: "8Gi"
        cpu: "2"
      limits:
        memory: "16Gi"
        cpu: "4"
```

Rook uses a `cacheMemoryLimitFactor` (default 0.5) to calculate the MDS cache limit from the pod memory limit. With a 16Gi pod limit and the default factor, the MDS cache would be set to 8GB. To explicitly override the cache limit, use the `ceph config set` command described below.

## Setting Cache Limit Via Ceph Config

You can also set this at the Ceph configuration level:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 8589934592

# Verify the setting
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mds mds_cache_memory_limit
```

## Checking Current Cache Usage

Monitor how much cache the MDS is actually using:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mds stat

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

For detailed cache statistics, use `ceph tell` to query the MDS admin socket (replace `myfs` with your filesystem name and `0` with the MDS rank):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs:0 cache status
```

## Tuning Cache Pressure Settings

Adjust how the MDS trims the cache:

```bash
# Trim check interval in seconds (default 1)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_trim_interval 1

# Decay half-life for the trim counter (default 1.0)
# Higher values slow down trimming; lower values make it more aggressive
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_trim_decay_rate 1.0
```

## Sizing Recommendations

Guidelines for MDS cache sizing:

```bash
# For small filesystems (< 10M files): 4GB cache
ceph config set mds mds_cache_memory_limit 4294967296

# For medium filesystems (10M - 100M files): 8-16GB
ceph config set mds mds_cache_memory_limit 8589934592

# For large filesystems (> 100M files): 16-32GB
ceph config set mds mds_cache_memory_limit 17179869184
```

Always set the Kubernetes memory limit to at least 50-100% above the MDS cache limit to account for other MDS memory usage. Under normal conditions, MDS can use approximately 130% of its cache size in total RAM.

## Summary

The MDS cache memory limit is a critical tuning parameter that directly affects CephFS metadata performance. In Rook, the cache limit is automatically derived from the pod's Kubernetes memory limit via `cacheMemoryLimitFactor`, or you can explicitly override it with `ceph config set mds mds_cache_memory_limit`. Ensure Kubernetes memory limits are set 50-100% above the MDS cache limit to prevent OOM kills. Monitor cache hit rates and actual usage to find the optimal value for your filesystem size and access patterns.
