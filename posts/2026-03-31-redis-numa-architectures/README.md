# How to Use Redis on NUMA Architectures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, NUMA, Performance

Description: Learn how to configure Redis for NUMA multi-socket servers to avoid cross-node memory penalties, pin processes to NUMA nodes, and maximize throughput on large machines.

---

NUMA (Non-Uniform Memory Access) systems have multiple CPU sockets, each with local memory. Accessing memory on a remote NUMA node is 20-40% slower than local access. For a memory-intensive workload like Redis, running without NUMA awareness can cause unexpected latency spikes.

## Check Your NUMA Topology

```bash
numactl --hardware
# node 0 cpus: 0-23
# node 1 cpus: 24-47
# node distances:
# node  0   1
#   0:  10  21
#   1:  21  10

lscpu | grep -i numa
numastat
```

## Run Redis Bound to a Single NUMA Node

The simplest approach is to bind Redis entirely to one NUMA node - CPU and memory:

```bash
numactl --cpunodebind=0 --membind=0 redis-server /etc/redis/redis.conf

# Verify the binding
cat /proc/$(pgrep redis-server)/status | grep Cpus_allowed
numastat -p $(pgrep redis-server)
```

## Run Multiple Redis Instances for Multi-Node Utilization

To use all NUMA nodes, run one Redis instance per node with different ports:

```bash
# Instance on NUMA node 0
numactl --cpunodebind=0 --membind=0 \
  redis-server --port 6379 --daemonize yes --logfile /var/log/redis-node0.log

# Instance on NUMA node 1
numactl --cpunodebind=1 --membind=1 \
  redis-server --port 6380 --daemonize yes --logfile /var/log/redis-node1.log
```

Clients route to the nearest instance based on which NUMA node the application process is on.

## Application-Side NUMA Affinity

Bind your application processes to the same NUMA node as their Redis instance:

```bash
# Bind app worker to NUMA node 0, use Redis on port 6379
numactl --cpunodebind=0 --membind=0 python3 app_worker.py --redis-port 6379

# Bind app worker to NUMA node 1, use Redis on port 6380
numactl --cpunodebind=1 --membind=1 python3 app_worker.py --redis-port 6380
```

## Disable NUMA Balancing to Prevent Page Migration

Linux automatic NUMA balancing can cause page migrations that stall Redis:

```bash
# Disable automatic NUMA balancing
echo 0 | sudo tee /proc/sys/kernel/numa_balancing

# Make persistent
echo 'kernel.numa_balancing=0' | sudo tee -a /etc/sysctl.d/redis-numa.conf
sudo sysctl -p /etc/sysctl.d/redis-numa.conf
```

## Transparent Huge Pages and NUMA

THP interacts poorly with NUMA by allowing pages to migrate between nodes. Disable it:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

## Monitor NUMA Statistics

```bash
# Check NUMA miss rate for Redis
numastat -p $(pgrep redis-server)

# High numa_miss / numa_foreign indicates cross-node access
# Output example:
# Per-node process memory usage (in MBs) for PID XXXXX (redis-server)
#                  Node 0    Node 1    Total
# Huge                0.00      0.00      0.00
# Heap               512.00      0.05    512.05
# Stack               0.00      0.00      0.00
```

## redis.conf Recommendations for NUMA Systems

```text
# Disable jemalloc background threads (they can run on remote NUMA nodes)
jemalloc-bg-thread no

# Use a fixed hz to keep background task frequency predictable
dynamic-hz no
hz 10

# Disable large page support
# (set in OS, not redis.conf)

# Disable automatic RDB saves (fork copy-on-write can spread pages across nodes)
save ""
```

## Summary

For Redis on NUMA systems, bind both the process and memory to a single NUMA node using `numactl --cpunodebind` and `--membind`. Disable automatic NUMA balancing and transparent huge pages to prevent page migrations. For full multi-socket utilization, run one Redis instance per NUMA node and route application processes to their local instance.
