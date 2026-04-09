# How to Perform Memory Profiling in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Memory Profiling, Performance, Debugging

Description: Learn how to perform memory profiling on Ceph daemons using tcmalloc heap profiling, admin socket commands, and perf dump to diagnose memory leaks and usage spikes.

---

Memory issues in Ceph daemons - whether gradual leaks or unexpected spikes - can cause OOM kills, slow OSDs, and degraded cluster performance. Ceph ships with built-in memory profiling support through tcmalloc's heap profiler, accessible via the admin socket.

## Prerequisites

Ceph daemons typically link against tcmalloc (part of gperftools), which includes the heap profiler. Verify this:

```bash
ldd /usr/bin/ceph-osd | grep tcmalloc
```

If not found, install gperftools:

```bash
sudo apt install google-perftools  # Ubuntu/Debian
sudo dnf install gperftools        # RHEL/CentOS
```

## Checking Current Memory Usage

Use the admin socket to query current memory usage per daemon:

```bash
# OSD memory usage
ceph tell osd.0 dump_mempools

# Monitor memory usage
ceph tell mon.a dump_mempools
```

Example output:

```json
{
  "mempool": {
    "by_pool": {
      "osd": {
        "items": 24532,
        "bytes": 12456789
      },
      "buffer_anon": {
        "items": 1024,
        "bytes": 4194304
      }
    },
    "total": {
      "items": 25556,
      "bytes": 16651093
    }
  }
}
```

## Enabling the Heap Profiler

Start heap profiling on a running daemon via the admin socket:

```bash
# Start profiling OSD 0
ceph tell osd.0 heap start_profiler

# Dump a heap profile snapshot
ceph tell osd.0 heap dump

# Stop profiling
ceph tell osd.0 heap stop_profiler
```

Profile files are written to `/tmp/` as `ceph-osd.0.heap.*.`.

## Analyzing Heap Profiles

Use the `pprof` tool from gperftools to analyze the dump:

```bash
# Text report
google-pprof --text /usr/bin/ceph-osd /tmp/ceph-osd.0.heap.0001.heap

# Generate call graph image
google-pprof --pdf /usr/bin/ceph-osd /tmp/ceph-osd.0.heap.0001.heap > heap.pdf

# Show top 20 allocators
google-pprof --text /usr/bin/ceph-osd /tmp/ceph-osd.0.heap.0001.heap | head -20
```

## Comparing Heap Snapshots

To find growth between two points in time:

```bash
# Take first snapshot
ceph tell osd.0 heap dump
# Wait and reproduce the suspect workload
sleep 300
# Take second snapshot
ceph tell osd.0 heap dump

# Compare the two profiles
google-pprof --base=/tmp/ceph-osd.0.heap.0001.heap --pdf \
  /usr/bin/ceph-osd /tmp/ceph-osd.0.heap.0002.heap > diff.pdf
```

## Monitoring Memory with Perf Counters

Track memory allocation rate over time via Prometheus:

```bash
# Query allocator stats
curl -s http://192.168.1.10:9283/metrics | grep "ceph_.*mem"
```

Key metrics to monitor:

- `ceph_bluestore_cache_bytes` - BlueStore cache memory per OSD
- `ceph_osd_numpg` - PG count (high PG count increases memory use)

## Configuring OSD Memory Target

Tune the OSD memory target to avoid over-provisioning:

```bash
# Set OSD memory target to 4GB
ceph config set osd osd_memory_target 4294967296

# Enable automatic cache size tuning
ceph config set osd bluestore_cache_autotune true
```

## Summary

Ceph memory profiling combines admin socket heap profiler commands (`ceph tell osd.X heap`), mempool dumps (`dump_mempools`), and perf counter metrics to diagnose leaks and usage spikes. Profile snapshots analyzed with `google-pprof` identify top allocators and memory growth between captures, while `osd_memory_target` and BlueStore cache autotuning give operators control over per-OSD memory consumption.
