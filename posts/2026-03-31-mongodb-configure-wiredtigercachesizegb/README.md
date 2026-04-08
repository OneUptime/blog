# How to Configure wiredTigerCacheSizeGB for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Configuration, Performance, Memory

Description: Learn how to set wiredTigerCacheSizeGB in MongoDB to control the in-memory cache size, avoid OOM kills, and optimize read performance.

---

The WiredTiger cache is MongoDB's primary in-memory data store. By default it takes 50% of available RAM minus 1 GB, but this default is often wrong for containers, shared servers, or write-heavy workloads. Configuring `wiredTigerCacheSizeGB` explicitly gives you control.

## Default Cache Calculation

MongoDB calculates the default cache size as:

```text
max(0.5 * (RAM - 1 GB), 256 MB)
```

On a 16 GB server:
```text
max(0.5 * (16 - 1), 0.256) = max(7.5, 0.256) = 7.5 GB
```

## Setting Cache Size in mongod.conf

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
```

Restart mongod after making this change:

```bash
sudo systemctl restart mongod
```

## Setting Cache Size at Runtime

You can adjust the cache size without a restart using `setParameter`:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=4G"
});
```

Note: runtime changes survive until the next restart. Always update `mongod.conf` as well.

## Verifying the Configuration

```javascript
db.serverStatus().wiredTiger.cache["maximum bytes configured"]
// Returns bytes, divide by 1073741824 for GB
```

Or via command line:

```bash
mongosh --eval "db.serverStatus().wiredTiger.cache['maximum bytes configured'] / 1073741824"
```

## Sizing Guidelines

| Scenario                       | Recommended Cache Size          |
|--------------------------------|---------------------------------|
| Dedicated MongoDB server       | 50-60% of total RAM             |
| Shared server (other services) | 25-35% of total RAM             |
| Container with memory limit    | 50% of container memory limit   |
| Read-heavy workload            | Maximize to working set size    |
| Write-heavy workload           | Reduce slightly to leave OS cache room |

## Container Considerations

In Docker or Kubernetes, older MongoDB versions (before 4.0.14/4.2.1) read the host RAM instead of the container memory limit. Modern versions detect cgroup limits, but it is still best practice to set cache size explicitly:

```yaml
# mongod.conf in a container with 4 GB memory limit
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1.5
```

Alternatively, pass it as a command argument:

```bash
mongod --wiredTigerCacheSizeGB 1.5
```

## Signs the Cache Is Too Small

```javascript
const cache = db.serverStatus().wiredTiger.cache;
const usedPct = cache["bytes currently in the cache"] / cache["maximum bytes configured"];
console.log("Cache utilization:", (usedPct * 100).toFixed(1) + "%");
```

Consistently over 90% utilization with high eviction rates suggests the cache is undersized.

## Summary

`wiredTigerCacheSizeGB` controls how much RAM MongoDB reserves for its internal cache. The default is 50% of RAM minus 1 GB, but this should be overridden for containers, shared servers, and workloads with known working set sizes. Always verify the effective value via `serverStatus()` after making changes, and monitor cache utilization to determine whether the size needs adjustment.
