# How to Configure Memory Limits for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Memory, Performance, WiredTiger, Configuration

Description: Learn how to configure memory limits in MongoDB to control RAM usage and prevent out-of-memory issues in production environments.

---

## Why Memory Management Matters in MongoDB

MongoDB is memory-hungry by default. The WiredTiger storage engine uses an internal cache and relies heavily on the operating system's file system cache. Without proper memory limits, MongoDB can consume all available RAM, causing OOM kills, swapping, and instability in shared or containerized environments.

## WiredTiger Cache Size

The primary memory setting is `wiredTigerCacheSizeGB`, which controls the size of the WiredTiger internal cache. By default, this is set to 50% of (RAM - 1 GB), with a minimum of 256 MB.

To configure it in `mongod.conf`:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

Or pass it as a command-line argument:

```bash
mongod --wiredTigerCacheSizeGB 2
```

## Setting Memory Limits in Docker

When running MongoDB in Docker, use cgroup memory limits alongside WiredTiger cache settings:

```bash
docker run -d \
  --name mongodb \
  --memory="4g" \
  --memory-swap="4g" \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret \
  mongo:7.0 --wiredTigerCacheSizeGB 1.5
```

## Kubernetes Resource Limits

In Kubernetes, set resource limits and configure the cache accordingly:

```yaml
resources:
  requests:
    memory: "2Gi"
  limits:
    memory: "4Gi"
env:
  - name: MONGO_INITDB_ROOT_USERNAME
    value: admin
```

And in the MongoDB config:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1.5
```

A good rule of thumb: set `cacheSizeGB` using MongoDB's default formula of 50% of (container memory limit - 1 GB), leaving the remainder for the OS page cache, connections, and other processes.

## Checking Current Memory Usage

Use the `serverStatus` command to check WiredTiger cache usage:

```javascript
db.serverStatus().wiredTiger.cache
```

Key fields to watch:
- `bytes currently in the cache` - current cache size
- `maximum bytes configured` - configured limit
- `pages evicted by application threads` - indicates cache pressure

## Monitoring with mongostat

```bash
mongostat --host localhost:27017 -u admin -p secret --authenticationDatabase admin
```

Watch the `res` column (resident memory in MB) and `dirty` (percentage of dirty data in the WiredTiger cache).

## OS-Level Considerations

MongoDB also uses the OS page cache for data files. To prevent MongoDB from consuming all OS memory:

1. Set `vm.swappiness` to a low value (1-10) to reduce swap usage:

```bash
echo 1 | sudo tee /proc/sys/vm/swappiness
```

2. Disable transparent huge pages (THP) for better performance:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

## Summary

Configuring memory limits for MongoDB involves setting `wiredTigerCacheSizeGB` in your config file, applying OS or container-level memory constraints, and monitoring cache pressure with `serverStatus`. Using MongoDB's default formula of 50% of (RAM - 1 GB) for the WiredTiger cache leaves room for the OS page cache and prevents OOM events in production.
