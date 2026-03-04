# How to Profile Memory Access Patterns with perf mem on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, perf, Memory, Performance, Profiling, NUMA, Linux

Description: Learn how to use perf mem on RHEL to profile memory access patterns and identify cache misses and NUMA issues.

---

The `perf mem` subcommand profiles memory load and store operations, helping you identify cache misses, NUMA remote access penalties, and memory-intensive code paths. This is valuable for optimizing data-heavy applications on RHEL.

## Prerequisites

- A RHEL system with perf installed
- Root or sudo access
- Hardware that supports memory profiling events (most modern x86_64 processors)

## Installing perf

```bash
sudo dnf install perf -y
```

## Recording Memory Access Events

Record memory load events:

```bash
sudo perf mem record -t load -- ./my-application
```

Record memory store events:

```bash
sudo perf mem record -t store -- ./my-application
```

Record both loads and stores:

```bash
sudo perf mem record -- ./my-application
```

Profile the entire system:

```bash
sudo perf mem record -a -- sleep 10
```

## Viewing Memory Access Reports

Generate a memory access report:

```bash
perf mem report
```

This shows memory access events sorted by latency, data source (L1 cache, L2 cache, L3 cache, local DRAM, remote DRAM), and the responsible code.

Generate a text report:

```bash
perf mem report --stdio
```

## Understanding Data Source Levels

The report shows where each memory access was satisfied:

- **L1 hit** - Fastest, served from L1 cache (approximately 1-4 cycles)
- **L2 hit** - Served from L2 cache (approximately 10 cycles)
- **L3 hit** - Served from L3 cache (approximately 30-40 cycles)
- **Local DRAM** - Served from local memory (approximately 60-100 cycles)
- **Remote DRAM** - Served from remote NUMA node memory (approximately 100-300 cycles)

High numbers of remote DRAM accesses indicate NUMA placement issues.

## Sorting by Latency

Sort memory events by access latency:

```bash
perf mem report --sort=mem,sym,dso --stdio
```

Focus on the highest latency accesses first, as these have the most room for optimization.

## Identifying Cache Miss Hotspots

Find functions with the most cache misses:

```bash
sudo perf record -e cache-misses -g -- ./my-application
perf report --stdio
```

For LLC (Last Level Cache) misses specifically:

```bash
sudo perf stat -e LLC-loads,LLC-load-misses,LLC-stores,LLC-store-misses -- ./my-application
```

## Profiling NUMA Memory Access

Check NUMA topology:

```bash
numactl --hardware
```

Profile memory accesses to identify remote NUMA node access:

```bash
sudo perf mem record -a -- sleep 30
perf mem report --sort=mem --stdio
```

Look for entries showing remote DRAM access. These are slower and indicate that data should be placed on the local NUMA node.

## Using perf c2c for Cache Contention

The `perf c2c` command specifically profiles cache-to-cache transfers (false sharing):

```bash
sudo perf c2c record -a -- sleep 10
sudo perf c2c report --stdio
```

This identifies cache lines that are being bounced between CPU cores, which is a common performance issue in multi-threaded applications.

## Practical Optimization Tips

After identifying memory access bottlenecks:

1. **Reduce cache misses** - Improve data locality by restructuring data layouts
2. **Fix NUMA placement** - Use `numactl` to bind processes to specific NUMA nodes
3. **Fix false sharing** - Pad data structures to avoid cache line conflicts
4. **Prefetch data** - Use compiler hints for predictable access patterns

Example NUMA-aware execution:

```bash
numactl --cpunodebind=0 --membind=0 ./my-application
```

## Conclusion

Profiling memory access patterns with perf mem on RHEL reveals cache efficiency and NUMA behavior. Focus on reducing remote DRAM accesses and LLC misses for the biggest performance gains. Use perf c2c to find false sharing issues in multi-threaded workloads.
