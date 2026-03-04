# How to Tune Memory and NUMA Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, NUMA, Performance, Tuning, Linux

Description: Learn how to tune memory and NUMA performance on RHEL to optimize memory-intensive workloads and multi-socket systems.

---

On multi-socket RHEL systems, Non-Uniform Memory Access (NUMA) architecture means that each CPU has local memory that is faster to access than remote memory on another socket. Proper NUMA tuning can significantly improve performance for memory-intensive applications.

## Prerequisites

- A RHEL system (preferably multi-socket for NUMA tuning)
- Root or sudo access

## Checking NUMA Topology

View the NUMA topology:

```bash
numactl --hardware
```

Example output:

```bash
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3 4 5 6 7
node 0 size: 32768 MB
node 1 cpus: 8 9 10 11 12 13 14 15
node 1 size: 32768 MB
node distances:
node   0   1
  0:  10  21
  1:  21  10
```

The distance table shows that local access (10) is faster than remote access (21).

## Binding Processes to NUMA Nodes

Run a process on a specific NUMA node:

```bash
numactl --cpunodebind=0 --membind=0 ./my-application
```

This binds both CPU and memory to node 0, ensuring all memory access is local.

Use preferred memory policy (allows fallback to remote):

```bash
numactl --cpunodebind=0 --preferred=0 ./my-application
```

Interleave memory across all nodes (good for initialization):

```bash
numactl --interleave=all ./my-application
```

## Tuning Virtual Memory Parameters

### vm.swappiness

Controls how aggressively the kernel swaps memory pages. Lower values keep more data in RAM:

```bash
# View current value
sysctl vm.swappiness

# Set to 10 (good for servers)
sudo sysctl -w vm.swappiness=10
```

### vm.dirty_ratio

Maximum percentage of system memory for dirty pages before writes are forced:

```bash
sudo sysctl -w vm.dirty_ratio=15
```

### vm.dirty_background_ratio

Percentage of memory at which background writeback starts:

```bash
sudo sysctl -w vm.dirty_background_ratio=5
```

### vm.zone_reclaim_mode

Controls NUMA zone reclaim behavior:

```bash
# 0 = disabled (default, allows allocation from remote nodes)
# 1 = enabled (reclaim local memory before using remote)
sudo sysctl -w vm.zone_reclaim_mode=0
```

For most workloads, keep this at 0. Set to 1 only if local memory access is critical.

Make settings persistent:

```bash
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/memory.conf
vm.swappiness=10
vm.dirty_ratio=15
vm.dirty_background_ratio=5
vm.zone_reclaim_mode=0
SYSCTL
sudo sysctl -p /etc/sysctl.d/memory.conf
```

## Configuring Transparent Huge Pages

Transparent Huge Pages (THP) can improve performance for some workloads but hurt others (especially databases):

```bash
# Check current setting
cat /sys/kernel/mm/transparent_hugepage/enabled

# Disable THP
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Enable THP
echo always | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Set to madvise (applications opt in)
echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

Make persistent via TuneD or kernel command line:

```bash
sudo grubby --update-kernel=ALL --args="transparent_hugepage=never"
```

## Configuring Explicit Huge Pages

Allocate explicit huge pages for applications that support them (like databases):

```bash
# Allocate 1024 huge pages (2MB each = 2GB total)
echo 1024 | sudo tee /proc/sys/vm/nr_hugepages

# Check allocation
cat /proc/meminfo | grep Huge
```

Make persistent:

```bash
echo "vm.nr_hugepages=1024" | sudo tee -a /etc/sysctl.d/hugepages.conf
sudo sysctl -p /etc/sysctl.d/hugepages.conf
```

## Monitoring Memory Performance

View memory usage:

```bash
free -h
```

View NUMA statistics:

```bash
numastat
```

View per-process NUMA allocation:

```bash
numastat -p $(pgrep my-application)
```

Monitor page faults:

```bash
perf stat -e page-faults,minor-faults,major-faults -- ./my-application
```

## Conclusion

Tuning memory and NUMA performance on RHEL involves binding processes to local NUMA nodes, adjusting virtual memory parameters, and configuring huge pages. For multi-socket systems, proper NUMA-aware placement can improve performance by 20-40% for memory-intensive workloads.
