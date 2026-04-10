# How to Identify Good and Bad Workloads for Cache Tiering in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Performance

Description: Learn which workloads benefit from Ceph cache tiering and which workloads are poor candidates, to avoid performance degradation and unnecessary complexity.

---

Cache tiering in Ceph works well for a specific class of workloads but can actually harm performance for many others. Understanding the characteristics of good and bad candidates helps you decide whether cache tiering is appropriate or whether an alternative like CRUSH device class placement would serve better.

## The Ideal Cache Tiering Workload

Cache tiering provides the greatest benefit when:

1. **The working set is significantly smaller than total data**: A 10 TiB hot dataset on top of 500 TiB cold storage is an ideal ratio
2. **Access patterns are highly skewed**: 80-90% of reads hit 10-20% of objects (Zipf distribution)
3. **Objects are accessed repeatedly**: The same objects are read multiple times over days or weeks
4. **Writes are infrequent relative to reads**: Read-heavy workloads maximize cache hit value

## Good Workload Examples

**Media serving**: A video library where popular videos are accessed thousands of times while the catalog tail is rarely touched. The top 5% of content handles 80% of requests.

**RGW static content**: An object store serving website assets where popular images and CSS files are requested constantly.

**Archival with hot index**: A system where metadata (index files, manifests) is accessed frequently but the actual archived data is rarely touched.

## Quantifying Working Set Size

Before implementing cache tiering, analyze your access patterns:

```bash
# Check aggregate I/O statistics (read/write ops and bandwidth) for the pool
ceph osd pool stats backing-pool

# Run a synthetic random read benchmark (first create test objects, then read them randomly)
rados -p backing-pool bench 300 write -t 16 --no-cleanup
rados -p backing-pool bench 300 rand -t 16
```

If the read/write ratio is heavily skewed toward reads and the working set fits in a cache tier, cache tiering may help.

## Bad Workload Examples

**Databases (PostgreSQL, MySQL)**: Database workloads have random small I/O patterns. The cache tier adds latency (extra network hop), and the hit set bloom filter adds overhead that exceeds the benefit for random access patterns.

```text
Database random read latency:
  Direct pool (SSD):   0.3 ms
  Cache tier (SSD):    1.2 ms (extra overhead of cache path)
```

**Large sequential scans**: Backup jobs, data migrations, and analytics scans access every object once. This defeats the hit set bloom filter and fills the cache with cold data, evicting actually hot objects.

**Write-heavy workloads**: Applications that overwrite data frequently (logs, metrics time series) generate constant cache writeback activity, adding load without providing read benefit.

**Kubernetes persistent volumes**: Most Kubernetes PV workloads (databases, stateful applications) involve random writes. The cache RMW cycle adds significant latency compared to direct SSD pool access.

## Decision Framework

```text
Question                              Cache Tier?
Hot set < 20% of total data?          Possibly yes
Read/write ratio > 5:1?               Possibly yes
Same objects accessed repeatedly?     Yes, good candidate
Sequential scan workloads?            No - cache pollution
Random write-heavy?                   No - RMW overhead
Latency sensitive (<1ms)?             No - cache adds latency
Kubernetes PVCs?                      No - use SSD pool directly
```

## Alternative to Cache Tiering: CRUSH Device Classes

For most workloads, placing the pool directly on the fast device class eliminates cache overhead entirely:

```bash
# Put this specific pool on SSDs directly - no cache tier complexity
ceph osd crush rule create-replicated ssd-rule default host ssd
ceph osd pool create hot-data-pool 32 32 replicated
ceph osd pool set hot-data-pool crush_rule ssd-rule
```

Applications place hot data in `hot-data-pool` and cold data in an HDD pool. Simpler, faster, and no dirty data risk.

## Summary

Cache tiering benefits workloads with highly skewed read patterns where a small hot set accounts for most accesses. It harms performance for databases, sequential scans, write-heavy applications, and latency-sensitive workloads. For most use cases, direct CRUSH device class assignment to SSD pools delivers better performance with far less operational complexity. Given that cache tiering is deprecated in Ceph Reef, new deployments should avoid it entirely.
