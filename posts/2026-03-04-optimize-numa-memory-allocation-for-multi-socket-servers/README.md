# How to Optimize NUMA Memory Allocation for Multi-Socket Servers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, NUMA, Linux

Description: Learn how to optimize NUMA Memory Allocation for Multi-Socket Servers on RHEL with step-by-step instructions, configuration examples, and best practices.

---

NUMA (Non-Uniform Memory Access) is a memory architecture used in multi-socket servers where each CPU socket has its own local memory. Accessing local memory is faster than accessing memory attached to another socket. Optimizing NUMA allocation can significantly improve performance.

## Prerequisites

- RHEL on a multi-socket server
- Root or sudo access
- `numactl` package

## Step 1: Install numactl

```bash
sudo dnf install -y numactl
```

## Step 2: Check NUMA Topology

```bash
numactl --hardware
```

Example output:

```bash
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3 4 5
node 0 size: 32768 MB
node 0 free: 28000 MB
node 1 cpus: 6 7 8 9 10 11
node 1 size: 32768 MB
node 1 free: 29000 MB
node distances:
node   0   1
  0:  10  21
  1:  21  10
```

The distance of 10 means local access, 21 means remote (slower).

## Step 3: View NUMA Statistics

```bash
numastat
numastat -p $(pidof myapp)
```

Key metrics:
- `local_node` - Memory allocated locally (good)
- `other_node` - Memory allocated remotely (potentially slow)

## Step 4: Pin a Process to a NUMA Node

```bash
numactl --cpunodebind=0 --membind=0 ./myapp
```

This runs myapp on CPUs from node 0 and allocates memory only from node 0.

## Step 5: Use Preferred Memory Policy

```bash
numactl --preferred=0 ./myapp
```

This prefers node 0 for memory but falls back to other nodes if node 0 is full.

## Step 6: Interleave Memory

For workloads that access memory uniformly across threads:

```bash
numactl --interleave=all ./myapp
```

This distributes memory evenly across all NUMA nodes.

## Step 7: Configure NUMA for systemd Services

```ini
[Service]
NUMAPolicy=bind
NUMAMask=0
```

Or for interleave:

```ini
[Service]
NUMAPolicy=interleave
NUMAMask=0-1
```

## Step 8: Monitor NUMA Performance

```bash
numastat -m
```

Watch for `other_node` allocations. High numbers indicate cross-node memory access.

```bash
perf stat -e node-loads,node-load-misses ./myapp
```

## Step 9: Kernel NUMA Balancing

RHEL has automatic NUMA balancing enabled by default:

```bash
cat /proc/sys/kernel/numa_balancing
```

The kernel periodically migrates pages to be closer to the CPUs that access them. You can disable it if you prefer manual control:

```bash
sudo sysctl -w kernel.numa_balancing=0
```

## Conclusion

NUMA-aware memory allocation on RHEL can dramatically improve performance on multi-socket servers. Use numactl to bind processes to specific nodes, monitor cross-node allocations with numastat, and let kernel NUMA balancing handle dynamic workloads.
