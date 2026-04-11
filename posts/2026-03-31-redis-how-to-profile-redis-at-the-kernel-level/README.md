# How to Profile Redis at the Kernel Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Profiling, Linux, Kernel, Observability

Description: Use Linux kernel profiling tools like perf, eBPF, and strace to diagnose Redis performance bottlenecks at the system call and CPU level.

---

## Why Kernel-Level Profiling

Redis operates in user space but interacts heavily with the Linux kernel for memory allocation, network I/O, and disk access. When Redis is slow or consuming unexpected CPU, application-level metrics alone are insufficient. Kernel-level profiling reveals syscall overhead, memory pressure, context switches, and scheduler latency that Redis tooling cannot expose.

## Tools for Kernel-Level Redis Profiling

- `perf` - CPU performance counter sampling and call graph collection
- `bpftrace` / `bcc` - eBPF-based dynamic tracing without patching Redis
- `strace` - system call tracing (high overhead, use sparingly)
- `vmstat` / `iostat` - system-wide resource monitoring
- `numastat` - NUMA memory allocation analysis

## Using perf to Profile Redis CPU Usage

### Install perf

```bash
sudo apt install -y linux-tools-common linux-tools-$(uname -r)
```

### Capture a CPU Flamegraph

Find the Redis process ID:

```bash
pgrep -x redis-server
```

Record a 30-second perf sample with call graphs:

```bash
sudo perf record -g -p $(pgrep -x redis-server) -o /tmp/redis-perf.data -- sleep 30
```

Generate a report:

```bash
sudo perf report -i /tmp/redis-perf.data --stdio | head -80
```

For a flamegraph, use Brendan Gregg's FlameGraph tools:

```bash
git clone https://github.com/brendangregg/FlameGraph /tmp/FlameGraph
sudo perf script -i /tmp/redis-perf.data | \
  /tmp/FlameGraph/stackcollapse-perf.pl | \
  /tmp/FlameGraph/flamegraph.pl > /tmp/redis-flamegraph.svg
```

Open the SVG in a browser to explore hot code paths.

### Identify Hot Functions

```bash
sudo perf top -p $(pgrep -x redis-server) -K
```

This shows which functions are consuming the most CPU cycles in real time. Common hotspots in a loaded Redis include `dictFind`, `lookupKeyRead`, `activeExpireCycle`, and network I/O functions.

## Profiling System Calls with strace

Use `strace` only in non-production or during a brief sampling window because it adds significant overhead:

```bash
sudo timeout 10 strace -p $(pgrep -x redis-server) -c
```

The `-c` flag summarizes syscall counts and time. The `timeout` command limits tracing to 10 seconds, after which strace detaches and prints the summary. Expected output:

```text
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 54.32    0.123456          10     12000           epoll_wait
 30.12    0.068000           5     13500           read
 10.45    0.023600           2     12000           write
  5.11    0.011560           1     11000           clock_gettime
```

If `epoll_wait` time is low and `read`/`write` time is high, Redis is CPU-bound on processing rather than waiting for network.

## Using eBPF with bpftrace

eBPF allows low-overhead dynamic tracing without modifying Redis. Install bpftrace:

```bash
sudo apt install -y bpftrace
```

### Trace Redis Read Latency

```bash
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_read /pid == '$(pgrep -x redis-server)'/ {
  @start[tid] = nsecs;
}
tracepoint:syscalls:sys_exit_read /pid == '$(pgrep -x redis-server)'/ {
  @latency = hist(nsecs - @start[tid]);
  delete(@start[tid]);
}
END { print(@latency); }'
```

### Trace epoll_wait Wake Times

```bash
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_epoll_wait /pid == '$(pgrep -x redis-server)'/ {
  @start[tid] = nsecs;
}
tracepoint:syscalls:sys_exit_epoll_wait /pid == '$(pgrep -x redis-server)'/ {
  @wait_ns = hist(nsecs - @start[tid]);
  delete(@start[tid]);
}
END { print(@wait_ns); }'
```

### Count malloc/free Calls in Redis

Using uprobes on the Redis binary:

```bash
sudo bpftrace -e '
uprobe:/usr/bin/redis-server:zmalloc {
  @[ustack] = count();
}
interval:s:10 { print(@); clear(@); exit(); }'
```

## Analyzing Memory with perf mem

If Redis shows high LLC (last-level cache) miss rates, profile memory access patterns:

```bash
sudo perf mem record -p $(pgrep -x redis-server) -- sleep 10
sudo perf mem report --stdio | head -50
```

High cache miss rates on `dictFind` or `raxSeek` indicate that Redis hash tables or stream indexes are too large to fit in CPU cache, causing random memory access patterns that degrade performance.

## NUMA Analysis

If your server has multiple NUMA nodes, Redis memory may be allocated on the wrong node:

```bash
numastat -p $(pgrep -x redis-server)
```

If Redis allocates mostly from a remote NUMA node, pin it to the local node:

```bash
sudo numactl --cpunodebind=0 --membind=0 redis-server /etc/redis/redis.conf
```

Or in systemd unit files:

```bash
# /etc/systemd/system/redis.service.d/numa.conf
[Service]
ExecStart=
ExecStart=numactl --cpunodebind=0 --membind=0 /usr/bin/redis-server /etc/redis/redis.conf
```

## Checking Context Switches

Excessive context switches indicate scheduler contention:

```bash
vmstat 1 10
```

Watch the `cs` column (context switches per second). In a healthy Redis deployment, context switches should be low. If context switches are high, check how many threads are competing for the Redis CPU cores:

```bash
pidstat -w -p $(pgrep -x redis-server) 1 10
```

## Summary

Kernel-level profiling of Redis combines perf for CPU flamegraphs, bpftrace for low-overhead dynamic tracing of syscalls and memory allocations, and NUMA tools for topology-aware tuning. Start with `perf top` to identify hot functions, use bpftrace to measure I/O and read latency distributions, and verify NUMA affinity to ensure Redis accesses local memory. These techniques reveal bottlenecks invisible to Redis's own monitoring commands.
