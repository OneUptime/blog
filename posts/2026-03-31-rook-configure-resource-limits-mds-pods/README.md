# How to Configure Resource Limits for Rook-Ceph MDS Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, MDS, CephFS, Resource, Pod

Description: Configure CPU and memory resource limits for Rook-Ceph MDS (metadata server) pods to ensure CephFS performance, prevent cache eviction, and support multi-filesystem deployments.

---

## Overview

The Ceph Metadata Server (MDS) manages the CephFS filesystem namespace, handling directory operations, file creation, and metadata caching. MDS performance is highly memory-sensitive - the metadata cache size directly impacts filesystem responsiveness. Misconfigured memory limits can cause excessive cache evictions and severe CephFS latency.

## Understanding MDS Resource Sensitivity

MDS pods are uniquely sensitive to memory limits because:
- The MDS maintains a large in-memory metadata cache
- Cache evictions trigger slow metadata operations
- Active-standby MDS pairs both need adequate resources
- Multi-filesystem clusters run separate MDS sets

## Configuring MDS Resources in CephFilesystem

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
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        cpu: "500m"
        memory: "4Gi"
      limits:
        cpu: "2000m"
        memory: "8Gi"
```

Apply:

```bash
kubectl apply -f cephfilesystem.yaml

# Verify MDS pods are running with new resources
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
kubectl -n rook-ceph describe pod rook-ceph-mds-myfs-a-<hash> | grep -A10 "Limits:"
```

## Configuring MDS Cache Size

Set the MDS cache size to use memory available within the pod's limit:

```bash
# Set MDS metadata cache size to 6GB (leave headroom below 8GB limit)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config set mds mds_cache_memory_limit 6442450944

# Verify
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config get mds mds_cache_memory_limit
```

## Monitoring MDS Memory and Cache

```bash
# Check MDS cache usage
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph tell mds.myfs-a dump_mempools

# View MDS cache stats
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph tell mds.myfs-a cache status

# Real-time pod memory
kubectl -n rook-ceph top pods -l app=rook-ceph-mds
```

## MDS Resource Sizing Guide

| Filesystem Size | MDS CPU Request | MDS CPU Limit | MDS Memory Request | MDS Memory Limit |
|---|---|---|---|---|
| < 1M files | 500m | 1000m | 2Gi | 4Gi |
| 1M-10M files | 1000m | 2000m | 4Gi | 8Gi |
| 10M-100M files | 2000m | 4000m | 8Gi | 16Gi |
| > 100M files | 4000m | 8000m | 16Gi | 32Gi |

## Detecting Cache Eviction Issues

```bash
# Check for high cache eviction rates
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph tell mds.myfs-a perf dump | grep -i evict

# Check for slow metadata operations caused by cache pressure
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph tell mds.myfs-a dump_ops_in_flight

# Monitor MDS log for cache trim messages
kubectl -n rook-ceph logs -l app=rook-ceph-mds --tail=100 | grep -i "cache\|trim\|evict"
```

## Multi-Active MDS for Large Workloads

For very large filesystems or high metadata throughput:

```yaml
spec:
  metadataServer:
    activeCount: 2    # Run 2 active MDS instances
    activeStandby: true
    resources:
      requests:
        cpu: "2000m"
        memory: "8Gi"
      limits:
        cpu: "4000m"
        memory: "16Gi"
```

## Summary

MDS pod resources are primarily driven by metadata cache size requirements. Always set the Ceph MDS cache memory limit slightly below the pod memory limit to leave headroom for the MDS process overhead. Start with 4Gi memory for small filesystems and scale up as file counts grow. Monitor cache eviction rates and slow metadata operations as indicators that memory limits need to be increased.
