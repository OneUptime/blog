# How to Monitor D3N Cache Hit Rates in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, Cache, Monitoring, RGW, Performance

Description: Monitor D3N cache hit rates in Ceph RGW using performance counters, admin socket commands, and Prometheus metrics to validate cache effectiveness.

---

## Overview

Monitoring cache hit rates is essential to verify that D3N is providing value. A low hit rate means objects are being fetched from the backend cluster repeatedly, negating the benefits of caching. This guide covers how to extract and interpret D3N hit rate metrics.

## Using the Admin Socket

The Ceph admin socket exposes real-time performance counters for RGW. Note that D3N does not register its own perf counters; RGW exposes general cache counters. In newer Ceph versions with D4N (the successor to D3N), dedicated datacache counters are available:

```bash
# Connect to the RGW admin socket
ceph daemon rgw.myzone perf dump

# Filter for cache-related counters
ceph daemon rgw.myzone perf dump | python3 -m json.tool | grep -A2 -i "cache"
```

Key counters to look for:

- `cache_hit` - number of RGW cache hits
- `cache_miss` - number of RGW cache misses
- `d4n_cache_hits` - number of D4N datacache hits (Ceph Reef+ with D4N enabled)
- `d4n_cache_misses` - number of D4N datacache misses (Ceph Reef+ with D4N enabled)
- `d4n_cache_evictions` - number of D4N datacache evictions (Ceph Reef+ with D4N enabled)

## Calculating Hit Rate

```bash
# Extract hit and miss counts
ceph daemon rgw.myzone perf dump > /tmp/d3n-perf.json

# Calculate hit rate with Python
python3 << 'EOF'
import json

with open('/tmp/d3n-perf.json') as f:
    data = json.load(f)

# Navigate the perf dump structure
# Simple counters are plain integers in perf dump JSON output
for section, metrics in data.items():
    if isinstance(metrics, dict):
        hits = metrics.get('cache_hit', 0)
        misses = metrics.get('cache_miss', 0)
        if hits + misses > 0:
            rate = hits / (hits + misses) * 100
            print(f"Hit rate: {rate:.1f}% ({hits} hits, {misses} misses)")
EOF
```

## Monitoring with Prometheus and Grafana

Ceph exposes metrics via the MGR Prometheus module. Enable it and configure scraping:

```bash
# Enable Prometheus module
ceph mgr module enable prometheus

# Check metrics endpoint
curl http://$(ceph mgr dump | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['active_addr'].split(':')[0])" ):9283/metrics | grep ceph_rgw_cache
```

Add a Grafana panel with this PromQL query:

```promql
rate(ceph_rgw_cache_hit[5m]) /
(rate(ceph_rgw_cache_hit[5m]) + rate(ceph_rgw_cache_miss[5m]))
```

## Interpreting Hit Rates

| Hit Rate | Assessment | Action |
|---|---|---|
| > 80% | Excellent | No action needed |
| 60-80% | Good | Monitor trends |
| 40-60% | Fair | Consider increasing cache size |
| < 40% | Poor | Review workload suitability for D3N |

## RGW Log Analysis

```bash
# Count D3N cache operations from RGW log
# D3N uses debug logging via the rgw_datacache subsystem
# Enable with: ceph config set client.rgw debug_rgw_datacache 20
journalctl -u ceph-radosgw@rgw.myzone --since "1 hour ago" --no-pager | \
    grep -ci "d3n.*read from cache"

journalctl -u ceph-radosgw@rgw.myzone --since "1 hour ago" --no-pager | \
    grep -ci "d3n.*write to cache"
```

## Resetting Counters for Clean Measurements

```bash
# Reset perf counters to start fresh measurement
ceph daemon rgw.myzone perf reset
```

## Summary

Monitoring D3N cache hit rates requires combining admin socket perf dump data, Prometheus metrics, and RGW log analysis. Aim for a hit rate above 60% - below that threshold, consider increasing cache size, reviewing whether your workload pattern suits D3N, or checking for configuration issues. Grafana dashboards provide the best long-term visibility into cache performance trends.
