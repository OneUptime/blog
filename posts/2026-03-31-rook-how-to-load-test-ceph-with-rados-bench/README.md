# How to Load Test Ceph with rados bench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Benchmarking, Storage

Description: Use rados bench to measure Ceph cluster write and read throughput, latency, and IOPS to establish performance baselines and validate hardware.

---

## What Is rados bench

`rados bench` is Ceph's built-in benchmarking tool that writes objects directly to a RADOS pool and measures throughput, IOPS, and latency. It provides a quick way to validate raw storage performance without the overhead of filesystem or block device layers.

## Prerequisites

Create a dedicated benchmark pool to avoid impacting production data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool create benchmark 64 64
```

## Running a Write Benchmark

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 write --no-cleanup
```

Parameters:
- `-p benchmark` - pool name
- `60` - duration in seconds
- `write` - write test
- `--no-cleanup` - keep objects for read tests

Example output:

```text
Total time run:         60.0
Total writes made:      6240
Write size:             4194304
Object size:            4194304
Bandwidth (MB/sec):     415.87
Stddev Bandwidth:       12.35
Max bandwidth (MB/sec): 436.00
Min bandwidth (MB/sec): 384.00
Average IOPS:           103
Stddev IOPS:            3
Max IOPS:               109
Min IOPS:               96
Average Latency(s):     0.154
Stddev Latency(s):      0.045
Max latency(s):         0.823
Min latency(s):         0.062
```

## Running Read Benchmarks

### Sequential Read Test

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 seq
```

### Random Read Test

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 rand
```

## Tuning Benchmark Parameters

### Adjust Object Size

Default object size is 4MB. Change it with `-b`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 write -b 1048576 --no-cleanup
```

This tests 1MB objects.

### Adjust Concurrency

Default is 16 concurrent operations. Increase for higher throughput:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 write -t 32 --no-cleanup
```

### Run Multiple Clients

For a more realistic load test, run from multiple pods simultaneously:

```bash
# Pod 1
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 write --no-cleanup &

# Pod 2 (requires second tools pod or separate namespace)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 60 write --no-cleanup &
```

## Cleaning Up After the Benchmark

Remove benchmark objects:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p benchmark 10 write --cleanup-only
```

Delete the benchmark pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool delete benchmark benchmark --yes-i-really-really-mean-it
```

## Interpreting Results

| Metric | Good Range (HDD) | Good Range (NVMe) |
|--------|-----------------|-------------------|
| Write Bandwidth | 100-300 MB/s | 1-3 GB/s |
| Write Latency | 5-20ms | 0.1-1ms |
| Write IOPS (4MB objects) | 25-75 | 250-750 |

## Summary

`rados bench` provides fast, direct-to-RADOS performance benchmarking for Ceph clusters. Run write tests with `--no-cleanup` followed by sequential and random read tests to get a comprehensive picture of cluster performance. Use concurrent clients and tuned object sizes to match your actual workload patterns for the most representative benchmarks.
