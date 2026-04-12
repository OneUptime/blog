# How to Right-Size MongoDB Atlas Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cost Optimization, Performance, Cluster

Description: Learn how to right-size MongoDB Atlas clusters by analyzing CPU, memory, disk I/O, and connection metrics to select the optimal instance tier.

---

## What Right-Sizing Means for Atlas Clusters

Right-sizing means choosing the smallest Atlas tier that satisfies your performance requirements with headroom for peak load. Under-sized clusters cause latency spikes and timeouts. Over-sized clusters waste money - teams commonly run clusters at 10-15% average CPU utilization while paying for much more capacity.

## Step 1: Collect Baseline Metrics

Before right-sizing, collect at least 2 weeks of metrics covering weekday and weekend patterns:

```bash
# Fetch CPU utilization metrics for the past 14 days
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/processes/{host}:{port}/measurements?granularity=PT1H&period=P14D&m=PROCESS_CPU_USER&m=PROCESS_CPU_KERNEL" \
  | python3 -c "
import json, sys, statistics
data = json.load(sys.stdin)
for m in data.get('measurements', []):
    values = [p['value'] for p in m['dataPoints'] if p['value'] is not None]
    if values:
        print(f\"{m['name']}: p50={statistics.median(values):.1f}% p95={sorted(values)[int(len(values)*0.95)]:.1f}% max={max(values):.1f}%\")
"
```

## Step 2: Define Right-Sizing Criteria

Use these thresholds to determine if a tier change is needed:

```text
Metric              Downsize If         Upsize If
CPU (p95)           < 20%               > 70%
RAM Utilization     < 50%               > 85%
Disk IOPS (p95)     < 30% of max        > 80% of max
Query Latency p95   Improves on smaller > 100ms on current
Connections         < 20% of max        > 80% of max
```

## Step 3: Check Memory and Cache Utilization

WiredTiger cache performance is often the bottleneck. Measure it:

```javascript
const status = db.adminCommand({ serverStatus: 1 });
const cache = status.wiredTiger.cache;

const usedGB = cache["bytes currently in the cache"] / 1024**3;
const maxGB = cache["maximum bytes configured"] / 1024**3;
const pagesFromDisk = cache["pages read into cache"];
const lookups = cache["pages requested from the cache"];
const hitRate = lookups > 0 ? ((lookups - pagesFromDisk) / lookups * 100) : 0;

print(`Cache: ${usedGB.toFixed(1)}/${maxGB.toFixed(1)} GB (${(usedGB/maxGB*100).toFixed(0)}% full)`);
print(`Hit rate: ${hitRate.toFixed(1)}%`);

if (hitRate < 95) {
  print("WARNING: Low cache hit rate - consider larger instance");
}
```

A cache hit rate below 90% indicates the working set does not fit in RAM.

## Step 4: Review Atlas Metrics Dashboard

Key charts to review in the Atlas Metrics dashboard:

```text
1. Opcounters - operations per second (helps size for throughput)
2. Connections - peak vs available
3. Network - bytes in/out (helps estimate bandwidth)
4. WiredTiger Cache - bytes in cache vs dirty bytes
5. System CPU - distinguish user (app) vs iowait (disk)
6. Disk IOPS - compare against instance IOPS limits
```

## Step 5: Simulate Tier Downgrade Impact

Before downgrading, estimate the impact on available resources:

```python
# Atlas instance tier specifications
tiers = {
    "M10":  {"cpu": 2,   "ram_gb": 2,   "storage_gb": 10,  "iops": 100},
    "M20":  {"cpu": 2,   "ram_gb": 4,   "storage_gb": 20,  "iops": 200},
    "M30":  {"cpu": 2,   "ram_gb": 8,   "storage_gb": 40,  "iops": 300},
    "M40":  {"cpu": 4,   "ram_gb": 16,  "storage_gb": 80,  "iops": 1000},
    "M50":  {"cpu": 8,   "ram_gb": 32,  "storage_gb": 160, "iops": 2000},
    "M60":  {"cpu": 16,  "ram_gb": 64,  "storage_gb": 320, "iops": 3000},
}

current_tier = "M50"
target_tier = "M40"

current = tiers[current_tier]
target = tiers[target_tier]

print(f"Downgrade {current_tier} -> {target_tier}:")
print(f"  CPU:  {current['cpu']} -> {target['cpu']} cores ({(target['cpu']/current['cpu']-1)*100:.0f}% change)")
print(f"  RAM:  {current['ram_gb']} -> {target['ram_gb']} GB ({(target['ram_gb']/current['ram_gb']-1)*100:.0f}% change)")
print(f"  IOPS: {current['iops']} -> {target['iops']} ({(target['iops']/current['iops']-1)*100:.0f}% change)")
```

## Step 6: Perform a Safe Tier Change

Change the cluster tier during a low-traffic window:

```bash
# Downgrade cluster tier
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X PATCH \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerSettings": {
      "instanceSizeName": "M40"
    }
  }'
```

Atlas performs rolling upgrades/downgrades with no downtime.

## Step 7: Monitor After Right-Sizing

After the tier change, watch key metrics for 48 hours:

```bash
# Monitor cluster after resize
watch -n 30 'curl -s -u "PUBLIC_KEY:PRIVATE_KEY" --digest \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/processes/{host}:{port}/measurements?granularity=PT5M&period=PT1H&m=PROCESS_CPU_USER" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); vals=[p[\"value\"] for p in d[\"measurements\"][0][\"dataPoints\"] if p[\"value\"]]; print(f\"CPU avg: {sum(vals)/len(vals):.1f}%\")"'
```

Revert immediately if p95 CPU exceeds 80% or query latency increases significantly.

## Summary

Right-sizing MongoDB Atlas clusters requires collecting 2 weeks of CPU, memory, cache hit rate, and IOPS metrics, applying standard thresholds to identify over-provisioned tiers, verifying cache hit rates above 90% before downsizing, performing tier changes during low-traffic windows, and monitoring for 48 hours after changes. Enable auto-scaling as a safety net to handle unexpected load spikes after right-sizing.
