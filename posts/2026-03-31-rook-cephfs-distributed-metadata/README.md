# How to Configure CephFS Distributed Metadata Cache in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Performance

Description: Learn how to configure the CephFS distributed metadata cache in Rook, tuning MDS memory and cache settings to optimize metadata-heavy workloads.

---

## Understanding the CephFS Metadata Cache

CephFS metadata is managed by the Metadata Server (MDS) daemon. The MDS caches directory entries, inodes, and other metadata in memory to serve lookups quickly without reading from the metadata pool on every request. A well-tuned metadata cache dramatically reduces latency for workloads that create, list, or stat many files.

The metadata cache is local to each MDS. In a multi-active MDS configuration, the directory tree is partitioned across MDS instances, and each instance caches its subtree.

## Key MDS Cache Parameters

The main settings that control the metadata cache:

- `mds_cache_memory_limit` - maximum memory the MDS will use for its cache (default: 4 GiB)
- `mds_cache_trim_threshold` - number of entries trimmed per tick to throttle cache trimming rate
- `mds_cache_trim_decay_rate` - controls how aggressively old entries are evicted
- `mds_health_cache_threshold` - fraction above which health warnings are issued

## Configuring MDS Cache via Rook

Rook automatically sets `mds_cache_memory_limit` based on the memory resource limit declared in the `CephFilesystem` CRD. By default, it uses 50% of the memory limit (factor of 0.5). You can adjust this ratio with the `cacheMemoryLimitFactor` field:

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
    - name: data0
      replicated:
        size: 3
  metadataServer:
    activeCount: 2
    activeStandby: true
    resources:
      requests:
        memory: "8Gi"
        cpu: "2"
      limits:
        memory: "16Gi"
        cpu: "4"
    cacheMemoryLimitFactor: 0.5
```

With a memory limit of 16 GiB and the default `cacheMemoryLimitFactor` of 0.5, Rook sets `mds_cache_memory_limit` to 8 GiB (8589934592 bytes). MDS uses approximately 125% of this value in actual RAM, so ensure the container memory limit has sufficient headroom.

## Applying Config Changes at Runtime

You can also tune the cache at runtime using the Rook toolbox without redeploying:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Increase cache limit on active MDS
ceph tell mds.myfs:0 config set mds_cache_memory_limit 8589934592

# Check current cache usage
ceph tell mds.myfs:0 cache status
```

Example cache status output:

```text
{
  "pool": {
    "items": 524288,
    "mem": "4.2 GiB"
  },
  "tables": {
    "inode": 312450,
    "dentry": 211838
  }
}
```

## Monitoring Cache Health

Watch for MDS cache pressure warnings in the Ceph health status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

A warning like `MDS_CACHE_OVERSIZED` means the cache is growing beyond its configured limit and the MDS may start trimming aggressively, which hurts performance. Increase the memory limit or add more MDS instances to distribute the load.

## Distributed Cache with Multiple Active MDS

With multiple active MDS daemons, each daemon owns a portion of the directory tree. Each maintains its own in-memory cache for its subtree. The total metadata cache capacity scales horizontally:

```yaml
metadataServer:
  activeCount: 4
  activeStandby: true
  resources:
    requests:
      memory: "6Gi"
    limits:
      memory: "12Gi"
  cacheMemoryLimitFactor: 0.5
```

This configuration provides 4 active MDS instances each with 6 GiB cache (50% of 12 GiB limit) - effectively 24 GiB total metadata cache capacity.

## Summary

The CephFS distributed metadata cache in Rook is configured through the memory resource limits in the `metadataServer` section of the CephFilesystem CRD. Rook automatically sets `mds_cache_memory_limit` based on the pod memory limit, and the ratio can be tuned with `cacheMemoryLimitFactor`. For metadata-intensive workloads, increase `activeCount` to distribute the directory tree and scale cache capacity. Monitor `ceph health detail` and `ceph tell mds.<name> cache status` to verify the cache is operating within healthy bounds.
