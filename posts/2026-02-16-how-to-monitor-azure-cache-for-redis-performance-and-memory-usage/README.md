# How to Monitor Azure Cache for Redis Performance and Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Redis, Monitoring, Performance, Memory Usage, Azure Monitor, Azure Cache for Redis

Description: Learn how to monitor Azure Cache for Redis performance metrics, memory usage, and set up alerts to prevent issues before they impact your application.

---

A Redis cache that you do not monitor is a Redis cache that will eventually surprise you. Maybe it will run out of memory at 3 AM. Maybe latency will creep up during peak hours and nobody will notice until customers start complaining. Azure Cache for Redis exposes a rich set of metrics through Azure Monitor, and this guide shows you how to use them effectively.

## Key Metrics You Should Track

Azure Cache for Redis exposes dozens of metrics, but not all of them are equally important. Here are the ones that matter most for day-to-day operations:

### Memory Metrics

- **Used Memory (usedmemory)**: The actual amount of memory consumed by your data in bytes. This is the most direct indicator of how full your cache is.
- **Used Memory Percentage (usedmemorypercentage)**: Used memory as a percentage of the total available memory for your cache tier. When this hits 100%, Redis starts evicting keys (if eviction is enabled) or rejecting writes (if eviction is disabled).
- **Used Memory RSS (usedmemory_rss)**: The amount of physical memory allocated to the Redis process by the OS. This is typically higher than usedmemory due to memory fragmentation.
- **Memory Fragmentation Ratio**: RSS divided by used memory. A ratio significantly above 1.0 means fragmentation is wasting memory.

### Performance Metrics

- **Server Load (serverLoad)**: CPU usage of the Redis server as a percentage. Sustained values above 70% mean you should consider scaling up.
- **Cache Latency (cacheLatency)**: The time to complete a cache operation. This is the single best indicator of cache health from a user perspective.
- **Operations Per Second (operationsPerSecond)**: The throughput of your cache. Useful for capacity planning and understanding load patterns.
- **Connected Clients (connectedclients)**: Number of active client connections. A sudden spike might indicate a connection leak.

### Hit/Miss Metrics

- **Cache Hits (cachehits)**: Number of successful key lookups.
- **Cache Misses (cachemisses)**: Number of lookups for keys that do not exist. A high miss rate means your cache is not effective.
- **Cache Hit Ratio**: Calculated as `hits / (hits + misses)`. You want this above 80% for most workloads.

### Network Metrics

- **Cache Read (cacheRead)**: Bytes read from the cache per second.
- **Cache Write (cacheWrite)**: Bytes written to the cache per second.
- **Total Keys (totalkeys)**: Number of keys currently stored.
- **Evicted Keys (evictedkeys)**: Number of keys removed due to memory pressure. Non-zero values here deserve investigation.
- **Expired Keys (expiredkeys)**: Number of keys that expired naturally via TTL. This is normal and expected.

## Viewing Metrics in the Azure Portal

The quickest way to see your cache health is through the Azure Portal.

1. Navigate to your Azure Cache for Redis instance.
2. Click "Metrics" under the Monitoring section in the left menu.
3. Click "Add metric" and select the metric you want to view.
4. Adjust the time range and aggregation (average, max, min, sum) as needed.

For a useful overview dashboard, add these four metrics to a single chart:

- Used Memory Percentage (average)
- Server Load (max)
- Cache Hits (sum)
- Cache Misses (sum)

## Querying Metrics with Azure CLI

You can also pull metrics programmatically using the Azure CLI. This is useful for scripts and automation.

```bash
# Get the used memory percentage over the last hour (1-minute intervals)
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Cache/redis/<cache-name>" \
  --metric "usedmemorypercentage" \
  --interval PT1M \
  --start-time "$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)" \
  --aggregation Average \
  --output table

# Get operations per second for the last 6 hours
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Cache/redis/<cache-name>" \
  --metric "operationsPerSecond" \
  --interval PT5M \
  --start-time "$(date -u -v-6H +%Y-%m-%dT%H:%M:%SZ)" \
  --aggregation Average \
  --output table

# Get evicted keys count for the last 24 hours
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Cache/redis/<cache-name>" \
  --metric "evictedkeys" \
  --interval PT1H \
  --start-time "$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)" \
  --aggregation Total \
  --output table
```

## Using Redis INFO Command Directly

Sometimes the built-in Azure metrics do not tell you enough. You can connect directly to your Redis instance and use the INFO command for detailed stats.

```bash
# Connect to the cache and pull server information
redis-cli -h <cache-name>.redis.cache.windows.net -p 6380 -a <access-key> --tls

# Inside redis-cli, get memory details
INFO memory

# Get stats about commands processed, connections, and keyspace
INFO stats

# Get client connection details
INFO clients

# Get keyspace information (number of keys per database)
INFO keyspace
```

Key fields to look at from INFO memory:

- `used_memory_human`: Human-readable used memory
- `used_memory_peak_human`: Peak memory usage since last restart
- `mem_fragmentation_ratio`: Memory fragmentation
- `maxmemory_human`: Maximum memory configured
- `maxmemory_policy`: What happens when maxmemory is reached

## Setting Up Alerts

Metrics without alerts are just pretty charts. Set up alerts for the conditions that actually matter.

### Critical: Memory Usage Above 85%

When memory usage exceeds 85%, you are entering dangerous territory. Evictions start, performance degrades, and you might hit OOM errors.

```bash
# Create an alert for high memory usage
az monitor metrics alert create \
  --name redis-memory-critical \
  --resource-group rg-redis \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Cache/redis/<cache-name>" \
  --condition "avg usedmemorypercentage > 85" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Insights/actionGroups/critical-alerts" \
  --description "Redis memory usage exceeds 85%"
```

### Warning: Server Load Above 70%

High CPU load means Redis is spending more time processing commands than it should. This leads to increased latency.

```bash
# Alert on high server load
az monitor metrics alert create \
  --name redis-cpu-warning \
  --resource-group rg-redis \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Cache/redis/<cache-name>" \
  --condition "avg serverLoad > 70" \
  --window-size 10m \
  --evaluation-frequency 5m \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Redis server load exceeds 70%"
```

### Warning: Evicted Keys Increasing

Key evictions mean you are running out of memory and Redis is dropping data to make room.

```bash
# Alert when keys are being evicted
az monitor metrics alert create \
  --name redis-evictions \
  --resource-group rg-redis \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Cache/redis/<cache-name>" \
  --condition "total evictedkeys > 100" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Redis is evicting keys due to memory pressure"
```

### Warning: Connected Clients Spike

A sudden increase in connected clients might indicate a connection leak or a traffic surge.

```bash
# Alert on unusual client connections
az monitor metrics alert create \
  --name redis-client-spike \
  --resource-group rg-redis \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Cache/redis/<cache-name>" \
  --condition "max connectedclients > 500" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3 \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-redis/providers/Microsoft.Insights/actionGroups/ops-team" \
  --description "Redis connected clients exceeded 500"
```

## Building a Monitoring Dashboard

Create a custom Azure Dashboard to get a single-pane view of your cache health.

```bash
# Create a dashboard using an ARM template or the portal
# Key tiles to include:
# 1. Used Memory Percentage (line chart, last 24 hours)
# 2. Server Load (line chart, last 24 hours)
# 3. Cache Hit Ratio (calculated metric, last 24 hours)
# 4. Operations Per Second (line chart, last 24 hours)
# 5. Connected Clients (line chart, last 24 hours)
# 6. Evicted Keys (bar chart, last 7 days)
# 7. Cache Latency P99 (line chart, last 24 hours)
```

You can also use Azure Workbooks for more advanced visualizations. Here is a KQL query you can use in a Workbook to calculate cache hit ratio over time:

```
AzureMetrics
| where ResourceProvider == "MICROSOFT.CACHE"
| where MetricName in ("cachehits", "cachemisses")
| summarize Hits = sumif(Total, MetricName == "cachehits"),
            Misses = sumif(Total, MetricName == "cachemisses")
            by bin(TimeGenerated, 5m)
| extend HitRatio = round(100.0 * Hits / (Hits + Misses), 2)
| project TimeGenerated, HitRatio, Hits, Misses
| order by TimeGenerated asc
```

## Common Issues and What Metrics Tell You

**Latency spikes during peak hours**: Check server load. If it is above 80%, you need a larger cache tier or clustering.

**Gradually increasing memory usage**: Check if TTLs are set on your keys. Keys without TTLs accumulate forever. Use `INFO keyspace` to see how many keys have expiration set.

**Sudden drop in hit ratio**: Something changed in your application's access patterns. Check if a deployment changed cache keys or TTLs.

**High fragmentation ratio (above 1.5)**: Redis memory is fragmented. A restart can fix this temporarily. If it recurs, you might need to adjust your data patterns (avoid storing and deleting many large values).

**Evictions without high memory usage**: Check if maxmemory is configured correctly for your tier. Also verify that your eviction policy makes sense for your workload.

## Wrapping Up

Monitoring Azure Cache for Redis comes down to watching a handful of critical metrics: memory usage, server load, latency, hit ratio, and evictions. Set up alerts for the thresholds that matter, build a dashboard for visual tracking, and periodically check the detailed INFO output for deeper insights. The goal is to catch problems before they affect your users - not after.
