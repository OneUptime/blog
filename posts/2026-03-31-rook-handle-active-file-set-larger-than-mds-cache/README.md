# How to Handle Active File Set Larger Than MDS Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Performance

Description: Learn how to diagnose and resolve CephFS MDS cache pressure when the active file working set exceeds the configured cache size.

---

## Understanding MDS Cache Pressure

In CephFS, the Metadata Server (MDS) maintains an in-memory cache of inode and directory entries. When the active working set of files being accessed by clients exceeds the MDS cache size, the MDS must evict cache entries and fetch them from disk on demand. This causes latency spikes, high MDS CPU usage, and in severe cases, client eviction.

Common symptoms include:

- `MDS_CACHE_OVERSIZED` health warning in `ceph status`
- Slow metadata operations (stat, readdir, open)
- MDS log messages showing `trim_lru` running frequently
- Elevated `mds_mem` metrics in Prometheus

## Step 1 - Check Current Cache Usage

Use the Rook toolbox to inspect MDS cache statistics:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs status
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph tell mds.* cache status
```

Sample output showing oversized cache:

```text
mds0: cache size 4GiB / 4GiB (100%), 2.1M inodes
WARNING: mds_cache_memory_limit exceeded
```

## Step 2 - Increase the MDS Cache Memory Limit

The default MDS cache limit is 4 GiB. Increase it by setting the `mds_cache_memory_limit` option:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_cache_memory_limit 8589934592
```

For persistent configuration in the Rook `CephFilesystem` resource, set the MDS pod memory limits. Rook automatically calculates `mds_cache_memory_limit` as approximately 50% of `resources.limits.memory` (controlled by the `cacheMemoryLimitFactor` field, which defaults to ~0.5):

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
    activeCount: 1
    activeStandby: true
    resources:
      limits:
        memory: "16Gi"
      requests:
        memory: "16Gi"
```

With `limits.memory: "16Gi"` and the default factor of ~0.5, Rook sets `mds_cache_memory_limit` to approximately 8 GiB.

## Step 3 - Tune Cache Trim Aggressiveness

If you cannot increase memory, tune how aggressively the MDS trims its cache:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_cache_reservation 0.10

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph config set mds mds_cache_trim_decay_rate 0.5
```

The `mds_cache_reservation` option (default 0.05) controls what fraction of the cache limit the MDS tries to keep free - increasing it to 0.10 triggers trimming earlier. The `mds_cache_trim_decay_rate` (default 1.0) controls the half-life of the trim throttle - lowering it to 0.5 allows the MDS to trim more frequently.

## Step 4 - Add Active MDS Daemons

For large workloads, distribute the namespace across multiple active MDS daemons using CephFS directory pinning:

```yaml
spec:
  metadataServer:
    activeCount: 2
    activeStandby: true
```

Then pin directories to specific MDS ranks:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolumegroup pin myfs <group> export <rank>
```

## Step 5 - Monitor Cache Health Over Time

Deploy Prometheus scraping and add a Grafana alert for cache saturation. The `ceph_mds_mem_rss` metric tracks the MDS process resident memory, which you can compare against the configured cache limit:

```yaml
groups:
- name: cephfs-mds
  rules:
  - alert: MDSCacheFull
    expr: ceph_mds_mem_rss > 0.9 * ceph_mds_cache_size
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MDS cache is near capacity"
```

## Summary

When the CephFS active file set exceeds MDS cache capacity, you will observe metadata slowdowns and health warnings. The primary fix is to increase `mds_cache_memory_limit` and allocate sufficient memory to the MDS pod. For very large workloads, scaling to multiple active MDS ranks with directory pinning distributes the cache load effectively. Monitoring cache usage with Prometheus ensures you catch pressure before clients are evicted.
