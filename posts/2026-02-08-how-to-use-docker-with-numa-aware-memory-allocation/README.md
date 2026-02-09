# How to Use Docker with NUMA-Aware Memory Allocation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, NUMA, Performance, Memory, Linux, Production, DevOps

Description: Learn how to configure Docker containers with NUMA-aware memory allocation for optimal performance on multi-socket servers.

---

Running Docker containers on multi-socket servers without thinking about NUMA (Non-Uniform Memory Access) topology is like driving a sports car in first gear. You technically get where you need to go, but you leave a lot of performance on the table. This guide walks through configuring Docker to be NUMA-aware so your containers access memory from the closest physical CPU node.

## What Is NUMA and Why Does It Matter?

Modern servers with multiple CPU sockets organize memory into nodes. Each CPU socket has its own local memory bank. When a process on CPU 0 accesses memory attached to CPU 1, it pays a latency penalty - sometimes 40% or more. This remote memory access is the core problem NUMA-aware allocation solves.

For containerized workloads like databases, in-memory caches, and high-throughput applications, this penalty adds up fast. A Redis container accessing remote memory for every GET operation will measurably underperform one pinned to local memory.

## Checking Your NUMA Topology

Before configuring anything, inspect your server's NUMA layout.

This command shows the NUMA node configuration and available memory per node:

```bash
# Display NUMA hardware topology
numactl --hardware
```

You will see output like this:

```
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3 4 5 6 7
node 0 size: 32768 MB
node 0 free: 28456 MB
node 1 cpus: 8 9 10 11 12 13 14 15
node 1 size: 32768 MB
node 1 free: 29012 MB
node distances:
node   0   1
  0:  10  21
  1:  21  10
```

The distance matrix tells the story. Accessing local memory (distance 10) is roughly twice as fast as remote memory (distance 21).

You can also check NUMA statistics to spot problems:

```bash
# Show NUMA memory allocation statistics
numastat
```

Look at the `numa_miss` and `numa_foreign` counters. High values indicate your workloads are frequently hitting remote memory.

## Pinning Docker Containers to NUMA Nodes

Docker exposes the `--cpuset-cpus` and `--cpuset-mems` flags to pin containers to specific NUMA nodes.

Pin a container to NUMA node 0 with its local CPUs and memory:

```bash
# Run a container pinned entirely to NUMA node 0
# CPUs 0-7 belong to node 0, and --cpuset-mems=0 restricts memory allocation to node 0
docker run -d \
  --name redis-node0 \
  --cpuset-cpus="0-7" \
  --cpuset-mems="0" \
  --memory="16g" \
  redis:7-alpine
```

For a second container on NUMA node 1:

```bash
# Run a container pinned to NUMA node 1
docker run -d \
  --name redis-node1 \
  --cpuset-cpus="8-15" \
  --cpuset-mems="1" \
  --memory="16g" \
  redis:7-alpine
```

This ensures each Redis instance accesses only local memory, eliminating cross-node latency.

## Using Docker Compose with NUMA Pinning

You can configure NUMA pinning in Docker Compose files too.

This Compose file pins two services to separate NUMA nodes:

```yaml
# docker-compose.yml - NUMA-aware service placement
version: "3.9"

services:
  # Database pinned to NUMA node 0
  postgres-primary:
    image: postgres:16-alpine
    cpuset: "0-7"
    mem_reservation: 8g
    mem_limit: 16g
    environment:
      POSTGRES_PASSWORD: secretpass
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: "8"
          memory: 16G

  # Cache pinned to NUMA node 1
  redis-cache:
    image: redis:7-alpine
    cpuset: "8-15"
    mem_reservation: 4g
    mem_limit: 8g
    command: redis-server --maxmemory 6gb --maxmemory-policy allkeys-lru

volumes:
  pgdata:
```

Note that `cpuset` in Compose maps to `--cpuset-cpus`. For `--cpuset-mems`, you need to use the deploy section or set it through the Docker daemon configuration.

## Configuring the Docker Daemon for NUMA

You can also set NUMA policies at the daemon level through `/etc/docker/daemon.json`.

This configuration sets default NUMA behavior for all containers:

```json
{
  "default-runtime": "runc",
  "cpu-rt-runtime": 950000,
  "default-cpus": "0-7",
  "default-mems": "0",
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

After editing, restart the Docker daemon:

```bash
# Restart Docker to pick up the new daemon configuration
sudo systemctl restart docker
```

## Monitoring NUMA Performance in Containers

Once your containers are running with NUMA pinning, verify the allocation is working correctly.

Check which NUMA node a running container is using:

```bash
# Find the container's main PID
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' redis-node0)

# Check the NUMA memory map for that process
sudo cat /proc/$CONTAINER_PID/numa_maps | head -20
```

The output shows memory pages and which NUMA node they reside on. You want to see most pages on your target node.

For ongoing monitoring, create a simple script that tracks NUMA allocation:

```bash
#!/bin/bash
# numa-monitor.sh - Monitor NUMA allocation for Docker containers
# Runs every 30 seconds and logs any cross-node memory access

CONTAINER_NAME=$1

while true; do
    PID=$(docker inspect --format '{{.State.Pid}}' "$CONTAINER_NAME" 2>/dev/null)
    if [ -z "$PID" ]; then
        echo "Container $CONTAINER_NAME not found"
        exit 1
    fi

    # Count pages per NUMA node
    echo "=== $(date) ==="
    sudo cat /proc/$PID/numa_maps | \
        awk '{for(i=1;i<=NF;i++) if($i ~ /^N[0-9]/) print $i}' | \
        sort | uniq -c | sort -rn

    sleep 30
done
```

Run the monitoring script:

```bash
# Start monitoring NUMA allocation for the Redis container
chmod +x numa-monitor.sh
./numa-monitor.sh redis-node0
```

## Benchmarking NUMA vs Non-NUMA Containers

Measure the actual difference NUMA pinning makes for your workload.

Run a memory-intensive benchmark without NUMA pinning:

```bash
# Baseline: no NUMA pinning
docker run --rm \
  --name bench-no-numa \
  --memory="8g" \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y sysbench && \
  sysbench memory --memory-block-size=1K --memory-total-size=10G run"
```

Then run the same benchmark with NUMA pinning:

```bash
# NUMA-pinned: container restricted to node 0
docker run --rm \
  --name bench-numa \
  --cpuset-cpus="0-7" \
  --cpuset-mems="0" \
  --memory="8g" \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y sysbench && \
  sysbench memory --memory-block-size=1K --memory-total-size=10G run"
```

Compare the throughput numbers. On a dual-socket system, the NUMA-pinned container typically shows 15-40% better memory throughput depending on the access pattern.

## Best Practices

Keep these guidelines in mind when working with NUMA and Docker:

1. **Match container count to NUMA nodes.** If you have 2 NUMA nodes, run 2 instances of your service instead of 1 large one. Each instance gets its own local memory pool.

2. **Never oversubscribe a NUMA node.** If node 0 has 32GB, do not allocate more than 28-30GB of container memory to it. Leave room for the kernel and other processes.

3. **Pin related containers together.** If a web server talks to a local cache frequently, put them on the same NUMA node to speed up network communication through shared memory.

4. **Check your topology after hardware changes.** BIOS updates, CPU replacements, or memory reconfigurations can change the NUMA layout.

5. **Use interleave mode for containers with unpredictable access patterns.** If your workload accesses memory randomly across a large dataset, interleaving across nodes can be better than pinning.

To run a container with interleaved NUMA memory:

```bash
# Use numactl inside the container for interleaved allocation
docker run -d \
  --name analytics-worker \
  --cpuset-cpus="0-15" \
  --privileged \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y numactl && \
  numactl --interleave=all /usr/local/bin/my-analytics-app"
```

## When Not to Bother

NUMA-aware allocation makes the biggest difference on systems with 2 or more CPU sockets and 64GB+ of RAM running memory-intensive workloads. If you are on a single-socket machine, a small VPS, or running lightweight containers, the complexity is not worth it. Focus on NUMA tuning when you are running databases, caches, message brokers, or data processing pipelines on bare metal multi-socket servers.

Getting NUMA right can turn a sluggish database container into a responsive one without spending a single dollar on new hardware. Start by checking your topology, pin your heaviest workloads, and measure the difference.
