# How to Tune D3N Cache Size for Optimal Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, Cache, Performance, Tuning, RGW

Description: Tune D3N cache size in Ceph RGW by analyzing workload patterns, measuring hit rates, and iteratively adjusting cache capacity to maximize read performance.

---

## Overview

D3N cache size has the single largest impact on cache effectiveness. Too small and evictions happen constantly; too large and you waste expensive SSD capacity. This guide provides a systematic approach to right-sizing your D3N cache.

## Understanding Cache Size Requirements

The ideal cache size depends on your working set - the set of objects that are accessed repeatedly. Cache size should ideally cover your hot working set.

```bash
# Estimate current working set - check objects accessed in last 24h via RGW access logs
grep "GET" /var/log/ceph/ceph-client.rgw.*.log | \
    awk '{print $7}' | sort | uniq -c | sort -rn | head -100
```

## Starting Configuration

Begin with a conservative cache size and grow it:

```bash
# Start with 10GB
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 10737418240

# Check current setting
ceph config get client.rgw.myzone rgw_d3n_l1_datacache_size
```

## Measuring Cache Utilization

```bash
# Check how full the cache is right now
du -sh /var/lib/ceph/rgw/cache
df -h /var/lib/ceph/rgw/cache

# Watch cache grow over time
watch -n 30 'du -sh /var/lib/ceph/rgw/cache && echo "---" && \
    ceph daemon rgw.myzone perf dump | python3 -m json.tool | grep -i "d3n_cache"'
```

## Calculating the Optimal Size

Use this script to analyze cache metrics and suggest a new size:

```python
import subprocess
import json

result = subprocess.run(
    ['ceph', 'daemon', 'rgw.myzone', 'perf', 'dump'],
    capture_output=True, text=True
)
data = json.loads(result.stdout)

# Extract D3N metrics from the dump
for section in data.values():
    if isinstance(section, dict):
        hits = section.get('d3n_cache_hit', {}).get('val', 0)
        misses = section.get('d3n_cache_miss', {}).get('val', 0)
        evictions = section.get('d3n_cache_eviction', {}).get('val', 0)
        total = hits + misses
        if total > 0:
            hit_rate = hits / total * 100
            eviction_rate = evictions / total * 100
            print(f"Hit rate: {hit_rate:.1f}%")
            print(f"Eviction rate: {eviction_rate:.1f}%")
            if eviction_rate > 10:
                print("RECOMMENDATION: Increase cache size by 50%")
            elif hit_rate > 85:
                print("Cache is well-sized")
```

## Adjusting Cache Size

```bash
# Increase cache size to 50GB
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 53687091200

# Restart RGW to apply
kubectl -n rook-ceph delete pod -l app=rook-ceph-rgw

# Or for systemd-managed
systemctl restart ceph-radosgw@rgw.myzone
```

## Cache Size Guidelines by Use Case

| Use Case | Recommended Cache Size |
|---|---|
| Dev/test environment | 5-10 GB |
| Small production (< 1TB data) | 20-50 GB |
| Medium production (1-10 TB) | 100-500 GB |
| Large production (> 10 TB) | 1-2 TB NVMe |

## Monitoring After Tuning

```bash
# Reset counters after resize for accurate measurement
ceph daemon rgw.myzone perf reset all

# Wait 24 hours then measure hit rate
ceph daemon rgw.myzone perf dump | python3 -m json.tool | grep d3n
```

## Summary

Tuning D3N cache size is an iterative process. Start by measuring your working set size and initial hit rates, then increase cache size if eviction rates are high or hit rates are below 60%. Use the admin socket performance counters to validate improvements after each adjustment, and allow 24 hours of warm-up time before making decisions.
