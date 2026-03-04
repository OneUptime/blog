# How to Monitor NUMA Performance with numastat on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NUMA, Performance, Monitoring, numastat, Linux

Description: Learn how to use numastat on RHEL to monitor NUMA memory allocation and identify performance issues on multi-socket systems.

---

On multi-socket RHEL systems, NUMA (Non-Uniform Memory Access) topology means that memory access speed depends on whether the memory is local to the CPU or on a remote socket. The `numastat` tool helps you monitor NUMA memory allocation and identify performance-degrading remote memory access.

## Prerequisites

- A RHEL system with multiple NUMA nodes
- Root or sudo access (for some features)

## Installing numastat

numastat is included in the numactl package:

```bash
sudo dnf install numactl -y
```

## Viewing NUMA Topology

Before using numastat, understand your NUMA layout:

```bash
numactl --hardware
```

Example output on a 2-socket system:

```
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3 4 5 6 7
node 0 size: 32768 MB
node 0 free: 12456 MB
node 1 cpus: 8 9 10 11 12 13 14 15
node 1 size: 32768 MB
node 1 free: 15678 MB
```

## Basic numastat Usage

Run numastat without arguments:

```bash
numastat
```

Output:

```
                           node0           node1
numa_hit               123456789       123456789
numa_miss                  12345           23456
numa_foreign               23456           12345
interleave_hit             56789           56789
local_node             123456789       123456789
other_node                 12345           23456
```

### Understanding the Metrics

- **numa_hit** - Allocations that were satisfied by the intended node
- **numa_miss** - Allocations that fell back to another node (performance concern)
- **numa_foreign** - Allocations intended for this node but allocated elsewhere
- **interleave_hit** - Interleave policy allocations on this node
- **local_node** - Allocations on the node where the process was running
- **other_node** - Allocations on a different node than where the process ran

High `numa_miss` and `other_node` values indicate poor NUMA placement.

## Per-Process NUMA Statistics

View NUMA memory allocation for a specific process:

```bash
numastat -p $(pgrep my-application | head -1)
```

View by process name:

```bash
numastat -p httpd
```

Output shows per-node memory allocation for the process:

```
Per-node process memory usage (in MBs) for PID 1234 (httpd)
                           Node 0          Node 1           Total
                  --------------- --------------- ---------------
Huge                         0.00            0.00            0.00
Heap                        45.20           12.30           57.50
Stack                        0.10            0.00            0.10
Private                    120.50           35.70          156.20
```

Ideally, a process should have most memory on its local NUMA node.

## System-Wide Memory per NUMA Node

View memory usage breakdown by node:

```bash
numastat -m
```

This shows detailed memory categories per node including:

- MemTotal, MemFree, MemUsed
- Active, Inactive
- FilePages, AnonPages
- Slab, KernelStack

## Continuous Monitoring

Watch NUMA statistics change over time:

```bash
watch -n 2 numastat
```

Monitor a specific process:

```bash
watch -n 5 "numastat -p $(pgrep my-application | head -1)"
```

## Identifying NUMA Problems

### Problem: High numa_miss Count

If `numa_miss` increases rapidly, processes are allocating memory from remote nodes. Fix by binding processes to their local node:

```bash
numactl --cpunodebind=0 --membind=0 ./my-application
```

### Problem: Unbalanced Memory Usage

If one node is nearly full while another has plenty of free memory:

```bash
numastat -m | grep MemFree
```

Consider rebalancing workloads or using interleave policy for large shared datasets:

```bash
numactl --interleave=all ./my-application
```

### Problem: Process Spanning Multiple Nodes

Check if a process has memory on multiple nodes:

```bash
numastat -p $(pgrep my-application | head -1)
```

If memory is spread across nodes, bind it to one node for better performance.

## Using numastat with PCP

Integrate NUMA monitoring with PCP:

```bash
pmval mem.numa.alloc.hit
pmval mem.numa.alloc.miss
```

## Conclusion

numastat on RHEL provides essential visibility into NUMA memory allocation. Monitor numa_miss and other_node counters to identify remote memory access. Use numactl to bind processes to their local NUMA node for optimal memory performance.
