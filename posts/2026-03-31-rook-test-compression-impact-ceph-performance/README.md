# How to Test Compression Impact on Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Benchmarking, Performance, Testing

Description: Learn how to benchmark the performance impact of BlueStore compression on Ceph IOPS and throughput using rados bench and fio, comparing compressed vs uncompressed pools.

---

## Why Test Compression Impact?

Compression adds CPU overhead and may alter I/O patterns. Before enabling compression in production, benchmarking quantifies:

- Throughput impact (MB/s) for sequential writes and reads
- IOPS impact for random 4KB operations
- CPU utilization increase

## Setting Up Test Pools

Create two identical pools - one with compression, one without:

```bash
ceph osd pool create bench-no-compress 32
ceph osd pool create bench-compress 32

# Enable compression on one pool
ceph osd pool set bench-compress compression_mode force
ceph osd pool set bench-compress compression_algorithm snappy
```

## Test 1: Sequential Write Throughput

```bash
echo "=== Without Compression ==="
rados -p bench-no-compress bench 60 write --no-cleanup -b 4096000 -t 16

echo "=== With Compression (compressible data) ==="
rados -p bench-compress bench 60 write --no-cleanup -b 4096000 -t 16
```

## Test 2: Sequential Read Throughput

```bash
echo "=== Without Compression ==="
rados -p bench-no-compress bench 60 seq -t 16

echo "=== With Compression ==="
rados -p bench-compress bench 60 seq -t 16
```

## Test 3: Random 4K IOPS with fio

Create a Ceph block device for each pool:

```bash
rbd create bench-no-compress/test-rbd --size 10G
rbd create bench-compress/test-rbd --size 10G
```

Run fio:

```bash
# Without compression
fio --name=randwrite --ioengine=rbd --pool=bench-no-compress \
  --rbdname=test-rbd --rw=randwrite --bs=4k --numjobs=4 \
  --iodepth=32 --runtime=60 --time_based

# With compression
fio --name=randwrite --ioengine=rbd --pool=bench-compress \
  --rbdname=test-rbd --rw=randwrite --bs=4k --numjobs=4 \
  --iodepth=32 --runtime=60 --time_based
```

## Test 4: CPU Monitoring During Benchmark

Monitor CPU usage on OSD nodes while running benchmarks:

```bash
# In a separate terminal
kubectl -n rook-ceph top pods -l app=rook-ceph-osd --sort-by=cpu
```

Or use node-level monitoring:

```bash
mpstat -P ALL 5 20
```

## Test 5: Incompressible Data (Worst Case)

Fill a pool with random data (incompressible):

```bash
dd if=/dev/urandom of=/tmp/random.bin bs=1M count=100

rados -p bench-compress put random-obj /tmp/random.bin
rados -p bench-no-compress put random-obj /tmp/random.bin
```

Compare read times:

```bash
time rados -p bench-compress get random-obj /dev/null
time rados -p bench-no-compress get random-obj /dev/null
```

## Analyzing Results

Typical results on NVMe clusters:
- Compressible data: 0-5% throughput reduction, 30-70% storage savings
- Incompressible data: 5-15% throughput reduction, ~0% storage savings
- CPU overhead: 5-15% additional CPU per OSD with snappy

## Summary

Test compression impact by creating paired pools with and without compression, then running rados bench and fio benchmarks with both compressible and incompressible data. Monitor CPU usage during tests. For most NVMe clusters, snappy compression reduces storage by 50% with less than 5% throughput overhead for compressible data. If incompressible data dominates your workload, disable compression to avoid the CPU tax without benefit.
