# How to Understand D3N (Datacenter Data Delivery Network) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, Caching, Performance

Description: Learn what the Datacenter Data Delivery Network D3N cache layer is in Ceph and how it accelerates read performance for compute-intensive workloads.

---

## What is D3N

D3N (Datacenter Data Delivery Network) is a distributed read caching layer for the Ceph RADOS Gateway (RGW). It is inspired by content delivery networks but operates within a datacenter to cache frequently accessed object data on local fast storage (typically NVMe SSDs) to reduce latency and improve read throughput for object storage workloads.

D3N was introduced to address scenarios where Ceph RGW serves the same objects repeatedly - such as machine learning training data, software packages, or media assets - where caching dramatically reduces backend I/O.

## How D3N Works

```text
Client Request
      |
      v
   RGW Instance
      |
      |-- Cache Hit? --> Serve from local NVMe SSD (low latency)
      |
      |-- Cache Miss? --> Fetch from RADOS backend
                              |
                              v
                         Store in D3N Cache
                              |
                              v
                         Serve to client
```

D3N caches are local to each RGW instance. In a multi-RGW deployment, each instance maintains its own independent cache. The cache is backed by a directory on a fast local disk (NVMe recommended) and uses a configurable eviction policy (LRU or Random).

## D3N vs Traditional RGW Caching

| Feature | Traditional RGW | D3N |
|---------|----------------|-----|
| Cache location | Memory (RAM) | NVMe SSD |
| Cache size limit | RAM capacity | Disk capacity (TBs) |
| Cache persistence | Lost on restart | On disk but purged on restart by default |
| Read amplification | High for cold data | Low for warm data |
| Best for | Low-latency small objects | Large repeated reads |

## When to Use D3N

D3N is most beneficial when:
- The same large objects are read repeatedly (e.g., ML training datasets)
- RGW instances have local NVMe storage available
- Network bandwidth between RGW and OSD nodes is a bottleneck
- Read throughput is more important than write performance

D3N does NOT help with:
- Write-heavy workloads (only reads are cached)
- Unique object access patterns (no repeated reads)
- Workloads where latency is already within acceptable bounds

## Enabling D3N in Rook-Ceph

Configure D3N in the CephObjectStore resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 2
  zone:
    name: default
```

D3N configuration is applied via Ceph config:

```bash
# Enable D3N cache on RGW
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set client.rgw.my-store rgw_d3n_l1_local_datacache_enabled true

# Set cache directory (must be on fast NVMe storage)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set client.rgw.my-store rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache

# Set cache size (e.g., 100GB)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set client.rgw.my-store rgw_d3n_l1_datacache_size 107374182400
```

## Monitoring D3N Cache Performance

D3N does not have dedicated perf counters. Monitoring is done via RGW log files. D3N-related log lines in `radosgw.*.log` contain the string `d3n`. Enable low-level D3N logs with the `debug_rgw_datacache` subsystem:

```bash
# Enable detailed D3N cache logging
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set client.rgw.my-store debug_rgw_datacache 20

# Check RGW logs for D3N cache activity
kubectl -n rook-ceph logs -l app=rook-ceph-rgw | grep -i d3n
```

## D3N Cache Eviction Policies

D3N supports two eviction policies:

```bash
# LRU (Least Recently Used) - default, evicts oldest accessed objects
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set client.rgw.my-store rgw_d3n_l1_eviction_policy lru

# Random - randomly evicts cached objects when space is needed
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set client.rgw.my-store rgw_d3n_l1_eviction_policy random
```

LRU is the default and is generally recommended for most workloads.

## Summary

D3N is a local NVMe cache layer for Ceph RGW that dramatically improves read performance for repeated object access patterns. It is ideal for machine learning, media serving, and software distribution workloads where the same large objects are read repeatedly. Enable it by configuring `rgw_d3n_l1_local_datacache_enabled` and pointing the cache path to a fast NVMe device, then monitor cache hit rates to validate performance improvements.
