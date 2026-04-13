# How to Configure WiredTiger Cache Size in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Performance Tuning, Configuration, Memory

Description: Learn how to configure the WiredTiger cache size in MongoDB to optimize memory usage and improve read/write performance for your workload.

---

## Introduction

WiredTiger is MongoDB's default storage engine. Its in-memory cache plays a critical role in performance - it stores frequently accessed working set data to avoid disk I/O. By default, MongoDB sets the WiredTiger cache to 50% of (RAM - 1 GB), with a minimum of 256 MB. Tuning this value for your workload can significantly improve throughput.

## Default Cache Size Formula

MongoDB calculates the default cache as:

```text
cache size = max(0.5 * (total RAM - 1 GB), 256 MB)
```

For a server with 16 GB RAM:

```text
cache size = max(0.5 * (16 - 1), 0.25) = max(7.5, 0.25) = 7.5 GB
```

## Configuring Cache Size in mongod.conf

Edit your `mongod.conf` file to set a custom cache size:

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
```

After editing, restart mongod:

```bash
sudo systemctl restart mongod
```

## Setting Cache Size via Command Line

You can also pass the cache size as a startup parameter:

```bash
mongod --wiredTigerCacheSizeGB 4 --dbpath /var/lib/mongodb
```

## Checking Current Cache Size

Query the server status to confirm the active cache configuration:

```javascript
db.serverStatus().wiredTiger.cache["maximum bytes configured"];
// Returns bytes - divide by 1073741824 to get GB
```

Or use the admin command:

```javascript
db.adminCommand({ serverStatus: 1 }).wiredTiger.cache;
```

Sample output fields:

```text
{
  "bytes currently in the cache": 3221225472,
  "maximum bytes configured": 4294967296,
  "bytes read into cache": 8589934592,
  "bytes written from cache": 2147483648
}
```

## Cache Size Guidelines

### Dedicated MongoDB Server

```text
Set cache to 50-60% of total RAM
Leave remaining RAM for OS filesystem cache and other processes
```

### Shared Server (MongoDB + App)

```text
Set cache to 25-35% of total RAM
Account for application memory usage
```

### Containerized Deployment

```yaml
# In mongod.conf for a container with 8GB limit
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 3
```

Always set a fixed cache size in containers - MongoDB may not correctly detect container memory limits on older versions.

## Monitoring Cache Effectiveness

Check the cache eviction and miss rates to determine if the cache is undersized:

```javascript
const stats = db.serverStatus().wiredTiger.cache;

const requested = stats["pages requested from the cache"];
const readFromDisk = stats["pages read into cache"];
const hitRatio = 1 - (readFromDisk / requested);

print(`Cache hit ratio: ${(hitRatio * 100).toFixed(1)}%`);
```

A hit ratio below 90% often indicates the cache is too small for the working set.

## WiredTiger Configuration for SSDs

On SSD-backed servers, you can afford a slightly smaller cache and rely on fast I/O:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 3
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true
```

## Dynamic Adjustment (MongoDB 3.2+)

As of MongoDB 3.2, you can change the cache size at runtime without restart:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=6G"
});
```

Verify the change took effect:

```javascript
db.adminCommand({ getParameter: 1, wiredTigerEngineRuntimeConfig: 1 });
```

## Summary

WiredTiger cache size is one of the most impactful MongoDB performance settings. The default formula works well for general workloads, but dedicated database servers benefit from increasing it to 50-60% of RAM. Monitor cache hit ratios via `serverStatus` to detect undersizing, and use dynamic configuration changes in MongoDB 3.2+ to tune without downtime.
