# How to Profile Ceph OSD Performance with perf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Profiling, OSD, Linux

Description: Use Linux perf tools to profile Ceph OSD processes, identify CPU hotspots, generate flame graphs, and pinpoint performance bottlenecks at the system call level.

---

## When to Profile Ceph OSDs

CPU profiling is useful when:
- OSDs consume unexpectedly high CPU without proportional I/O throughput
- Latency spikes occur during specific operations (compaction, deep scrub)
- After tuning changes don't improve performance as expected
- Investigating write amplification from BlueStore or RocksDB compaction

## Installing perf Tools

```bash
# RHEL/Rocky/CentOS
dnf install -y perf

# Ubuntu/Debian
apt install -y linux-tools-$(uname -r) linux-tools-generic

# Verify perf works
perf stat ls
```

## Identifying the OSD Process

Find the PID of the OSD you want to profile:

```bash
# Find all OSD processes
ps aux | grep ceph-osd | grep -v grep

# Or from systemd
systemctl show ceph-osd@0 --property=MainPID | cut -d= -f2

# In Kubernetes/Rook
kubectl exec -n rook-ceph -it $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph-osd-id=0 -o name) -- bash
```

## Basic CPU Sampling

Record a CPU profile of an OSD under load:

```bash
# Profile OSD 0 for 30 seconds (requires OSD PID)
OSD_PID=$(pgrep -f 'ceph-osd -i 0')
perf record -F 99 -p $OSD_PID -g -- sleep 30
perf report --stdio | head -50
```

Sample output showing top functions:

```text
# Overhead  Command    Shared Object        Symbol
    15.42%  ceph-osd   libbluestore.so      BlueStore::_txc_finalize_kv
    12.31%  ceph-osd   librocksdb.so        rocksdb::CompactionJob::Run
     8.17%  ceph-osd   ceph-osd             OSD::_process
     6.44%  ceph-osd   libc.so.6            __memcpy_avx_unaligned
```

## Generating Flame Graphs

Flame graphs provide a visual representation of where CPU time is spent:

```bash
# Clone FlameGraph tools
git clone https://github.com/brendangregg/FlameGraph
cd FlameGraph

# Record OSD profile
perf record -F 99 -p $OSD_PID -g -- sleep 60
perf script | ./stackcollapse-perf.pl > out.folded
./flamegraph.pl out.folded > osd-flamegraph.svg

# Open the SVG in a browser
```

## Profiling Specific Operations

Profile only during a specific test window:

```bash
# Start recording in background
perf record -F 99 -p $OSD_PID -g --output=osd-benchmark.data &
PERF_PID=$!

# Run your benchmark
rados bench -p test-pool 30 write --no-cleanup -b 4M -t 8

# Stop recording
kill $PERF_PID
perf report --input=osd-benchmark.data --stdio | head -100
```

## System Call Tracing

Use `perf trace` to identify slow system calls:

```bash
# Trace I/O system calls for OSD 0
perf trace -e read,write,pread64,pwrite64 -p $OSD_PID --duration 0.1 2>&1 | head -50
# Shows calls slower than 0.1 ms

# Count system calls by type
perf stat -e syscalls:sys_enter_write,syscalls:sys_enter_read \
    -p $OSD_PID sleep 10
```

## Profiling RocksDB Compaction

RocksDB compaction is a common CPU hotspot. Detect it:

```bash
# Check if compaction is happening
ceph daemon osd.0 perf dump rocksdb | grep compact

# Profile with compaction-specific callchain depth
perf record -F 99 -p $OSD_PID --call-graph dwarf -- sleep 30
perf report --call-graph fractal | grep -A5 compaction
```

## Profiling in Kubernetes Containers

For Rook OSD pods, use nsenter to run perf in the container's namespace:

```bash
# Get OSD pod and host PID
OSD_POD=$(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph-osd-id=0 -o name)
CONTAINER_PID=$(docker inspect $(docker ps | grep rook-ceph-osd | awk '{print $1}') --format '{{.State.Pid}}' 2>/dev/null)

# Run perf inside container namespace
nsenter -t $CONTAINER_PID -m -u -i -n -p -- \
    perf record -F 99 -a -g -- sleep 30
```

## Summary

Linux perf provides powerful OSD profiling capabilities ranging from statistical CPU sampling to system call tracing. Flame graphs are the most effective way to identify CPU hotspots in BlueStore and RocksDB code paths. In Rook Kubernetes environments, `nsenter` allows running perf tools inside container namespaces without modifying container images. Focus profiling effort on periods of high latency or CPU utilization to isolate the root cause of performance issues.
