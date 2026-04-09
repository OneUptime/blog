# How to Enable Fast Read Optimization for Erasure Coded Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Erasure Coding, Fast Read, Performance Optimization

Description: Enable and configure fast_read optimization on Ceph erasure coded pools to reduce read latency by requesting data from all shards simultaneously.

---

## What Is Fast Read

In a standard erasure coded read, Ceph contacts the minimum number of OSDs needed to reconstruct the object (K data shards). If any of those OSDs are slow or temporarily unavailable, the entire read waits.

The `fast_read` optimization changes this behavior: Ceph simultaneously sends read requests to ALL K+M shards and uses whichever K respond first. This reduces the impact of slow or temporarily overloaded OSDs, improving tail latency.

## Trade-offs

```text
fast_read=false (default):
  - Contacts exactly K shards per read
  - Less OSD I/O load
  - Higher tail latency if any shard is slow

fast_read=true:
  - Contacts all K+M shards per read
  - More OSD I/O load (K+M vs K operations)
  - Lower tail latency (uses fastest responding shards)
  - Better performance when some OSDs are under load
```

## Enabling Fast Read

```bash
# Enable fast_read on an EC pool
ceph osd pool set my-ec-pool fast_read true

# Verify the setting
ceph osd pool get my-ec-pool fast_read
```

## Enabling Fast Read at Pool Creation

```bash
# Create profile
ceph osd erasure-code-profile set ec-fast k=4 m=2 plugin=jerasure technique=reed_sol_van

# Create pool with fast_read enabled
ceph osd pool create fast-ec-pool 128 128 erasure ec-fast
ceph osd pool set fast-ec-pool fast_read true
```

## When to Use Fast Read

Fast read is most beneficial in these scenarios:

### Heterogeneous OSD Performance

When OSDs have different performance characteristics (e.g., a mix of fast and slow disks):

```text
OSD 0 (NVMe): 500 microseconds per read
OSD 1 (SSD):  800 microseconds per read
OSD 2 (SSD):  820 microseconds per read
OSD 3 (SSD):  810 microseconds per read
OSD 4 (HDD): 5000 microseconds per read
OSD 5 (HDD): 5200 microseconds per read

EC 4+2: Without fast_read, must wait for all 4 data shards
        With fast_read, use whichever 4 of 6 respond first
        -> Avoids the 2 HDD shards if 4 SSD/NVMe shards respond first
```

### Networks with Variable Latency

When network paths to different OSDs have variable latency, fast_read ensures reads complete via the lowest-latency path.

### Latency-Sensitive EC Pool Workloads

For EC pools serving latency-sensitive applications where you want to minimize P99/P999 read latency:

```bash
# Identify your current P99 latency
ceph osd perf --format json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for osd in data.get('osdstats', {}).get('osd_perf_infos', []):
    print(f\"OSD {osd['id']}: apply_latency={osd['perf_stats']['apply_latency_ms']}ms\")
"
```

## Monitoring Fast Read Impact

```bash
# Watch cluster I/O stats before and after enabling
ceph osd perf

# Monitor op throughput
ceph -w

# Use rados bench for controlled testing
rados bench -p fast-ec-pool 60 rand -t 32 --no-cleanup
```

Compare with fast_read disabled:

```bash
# Disable, benchmark, re-enable
ceph osd pool set fast-ec-pool fast_read false
rados bench -p fast-ec-pool 60 rand -t 32 --no-cleanup

ceph osd pool set fast-ec-pool fast_read true
rados bench -p fast-ec-pool 60 rand -t 32 --no-cleanup
```

## Impact on Cluster Load

Fast read increases OSD IOPS by a factor of (K+M)/K per read:

```text
EC 4+2: Without fast_read: 4 reads per object
        With fast_read:    6 reads per object (50% more OSD I/O)

EC 8+3: Without fast_read: 8 reads per object
        With fast_read:    11 reads per object (37.5% more OSD I/O)
```

On clusters near I/O saturation, enabling fast_read may worsen performance. Always benchmark under realistic load.

## Disabling Fast Read

```bash
# Disable fast_read to reduce OSD load
ceph osd pool set fast-ec-pool fast_read false
```

## Rook Configuration

In Rook, configure fast_read via the CephBlockPool or post-creation via the toolbox:

```bash
# Via Rook toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set my-ec-pool fast_read true
```

Or using Rook's CephBlockPool custom config:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: my-ec-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  parameters:
    fast_read: "true"
```

## Summary

The `fast_read` optimization for Ceph erasure coded pools reduces read tail latency by sending read requests to all K+M shards simultaneously and using the K fastest responses. This is most beneficial in clusters with heterogeneous OSD performance or variable network latency. The trade-off is increased OSD I/O load (by a factor of (K+M)/K), so it should be benchmarked under realistic conditions before enabling in production. Enable it with `ceph osd pool set my-ec-pool fast_read true`.
