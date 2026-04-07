# How to Troubleshoot MDS Memory Usage Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Memory, Troubleshooting, Kubernetes

Description: Learn how to diagnose and fix MDS memory issues in CephFS, including OOM kills, memory leaks, cache bloat, and excessive capability usage.

---

## Understanding MDS Memory Usage

The MDS process uses memory for several purposes:
- Metadata cache (inodes, dentries, directory entries)
- Client sessions and capability state
- Journal write-back buffer
- In-memory operation queues
- Internal Ceph library overhead (~500MB base)

When MDS memory usage exceeds the Kubernetes limit, the pod is OOM-killed, causing a failover that can disrupt all CephFS clients.

## Checking Current Memory Usage

Monitor MDS memory consumption:

```bash
# Kubernetes-level memory usage
kubectl -n rook-ceph top pods -l app=rook-ceph-mds

# MDS internal memory breakdown
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a cache status | python3 -m json.tool
```

Key fields in cache status:
- `cache_size` - bytes used by metadata cache
- `num_inodes` - inode count in cache
- `num_dentries` - dentry count in cache

## Diagnosing OOM Kill Events

Check if MDS pods have been OOM-killed:

```bash
kubectl -n rook-ceph describe pod -l app=rook-ceph-mds | \
  grep -E "OOMKilled|Exit Code|Reason"

# Check recent pod restart history
kubectl -n rook-ceph get pods -l app=rook-ceph-mds -o wide
```

Look for `OOMKilled` in the `Reason` field or high restart counts.

## Setting Appropriate Memory Limits

The Kubernetes memory limit must be higher than `mds_cache_memory_limit` to account for non-cache memory usage:

```yaml
metadataServer:
  config:
    MDS_CACHE_MEMORY_LIMIT: "4294967296"  # 4GB cache
  resources:
    requests:
      memory: "5Gi"
    limits:
      memory: "6Gi"   # 50% above cache limit for overhead
```

A safe rule of thumb: set `limits.memory` to cache limit + 2GB minimum.

## Reducing Cache Memory Usage

If you cannot increase the memory limit, reduce cache usage:

```bash
# Reduce MDS cache size
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 2147483648

# More aggressively trim the cache by increasing reservation (default 0.05)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_reservation 0.10

# Reduce journal size to free memory
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_journal_max_events 50000
```

## Dealing with Capability Bloat

Too many open file capabilities consume significant MDS memory:

```bash
# Check total capabilities in use
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.myfs.a session ls | \
  python3 -c "import json,sys; s=json.load(sys.stdin); \
  print('Total caps:', sum(x.get('num_caps',0) for x in s))"

# Set a per-client cap limit
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_max_caps_per_client 16384
```

## Checking for Memory Leaks

Persistent memory growth that continues after load decreases suggests a leak. Compare memory usage across MDS generations:

```bash
# Log memory over time
while true; do
  kubectl -n rook-ceph top pods -l app=rook-ceph-mds --no-headers
  sleep 60
done
```

If memory grows monotonically with no correlation to client count or cache size, report the version and symptoms to the Ceph issue tracker.

## Summary

MDS memory issues primarily stem from the metadata cache growing larger than available memory. Address this by ensuring Kubernetes memory limits are set significantly above the MDS cache memory limit, enabling aggressive cache trimming when under pressure, and limiting per-client capabilities. Track memory trends over time to distinguish expected growth from genuine leaks, and always use standby-replay so that OOM-related failovers complete quickly.
