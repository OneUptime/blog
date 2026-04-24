# How to Reduce Portainer Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Memory, Performance, Optimization, Docker, Resource Management

Description: Learn how to reduce Portainer's memory footprint by tuning snapshot intervals, garbage collection, log levels, and database compaction.

---

Portainer can consume significant memory when managing many environments with frequent snapshots. This guide covers practical steps to reduce memory usage without sacrificing functionality.

## Diagnosing Memory Usage

Check current Portainer memory consumption:

```bash
# Real-time memory stats

docker stats portainer --no-stream --format '{{.MemUsage}}'

# Detailed memory breakdown
docker exec portainer grep -E 'VmRSS|VmSwap|VmPeak' /proc/1/status
```

The main memory consumers in Portainer are:

1. **Snapshot data** - `DockerSnapshotRaw` includes container, image, network, volume, and engine data stored in Portainer's database
2. **Go runtime** - garbage-collected heap and other runtime-managed memory
3. **Active HTTP connections** - WebSocket sessions for logs/console
4. **BoltDB mmap** - memory-mapped database file

## Step 1: Increase Snapshot Interval

Each snapshot job gathers environment state and stores a snapshot in Portainer's database. Reducing snapshot frequency can reduce snapshot work and database growth:

```bash
docker run -d \
  --name portainer \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval 15m    # 15 minutes instead of the 5-minute default
```

## Step 2: Tune Go Garbage Collector

The Go runtime's garbage collector can be tuned to trade CPU for lower memory:

```bash
docker run -d \
  --name portainer \
  -e GOGC=50 \
  -e GOMEMLIMIT=400MiB \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

`GOGC=50` triggers garbage collection when heap grows to 50% above the last collection (default is 100%), reducing peak memory at the cost of slightly more CPU. `GOMEMLIMIT=400MiB` sets a soft memory limit for the Go runtime (Go 1.19+).

## Step 3: Compact the BoltDB Database

A larger database can increase Portainer's mapped address space because BoltDB uses a memory-mapped database file:

```bash
# Check current database size
docker exec portainer du -sh /data/portainer.db

# Recreate Portainer once with startup compaction enabled
docker stop portainer
docker rm portainer
docker run -d \
  --name portainer \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --compact-db

# Compare size after compaction
docker exec portainer du -sh /data/portainer.db
```

## Step 4: Reduce Log Level

Using a higher minimum log level reduces log volume. Portainer supports `DEBUG`, `INFO`, `WARN`, and `ERROR`:

```bash
docker run -d \
  --name portainer \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level WARN   # Only log warnings and errors
```

## Step 5: Set a Memory Limit to Cap Usage

Set a memory limit to prevent Portainer from consuming all available RAM:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    mem_limit: 512m
    memswap_limit: 512m   # Disable swap extension

volumes:
  portainer_data:
```

If Portainer is OOM-killed at 512 MB, increase to 768 MB or 1 GB for large deployments.

## Step 6: Remove Unused Environments

Each connected environment consumes resources for snapshot collection and storage. Remove unused or decommissioned environments:

1. In Portainer, go to **Environments**.
2. Select unused environments and click **Remove**.

## Memory Usage by Scale

Actual memory usage varies by Portainer version, snapshot interval, and the size of each environment. Measure your own baseline with `docker stats` after each change.

## Monitoring Memory Trends

Track memory over time to catch gradual leaks:

```bash
# Log memory every 5 minutes
while true; do
  echo "$(date +%H:%M) $(docker stats portainer --no-stream --format '{{.MemUsage}}')"
  sleep 300
done >> /var/log/portainer-memory.log
```
