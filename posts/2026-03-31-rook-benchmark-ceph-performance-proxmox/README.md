# How to Benchmark Ceph Performance in Proxmox

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Proxmox, Benchmark, Performance, Storage

Description: Learn how to benchmark Ceph storage performance in a Proxmox environment using fio, rados bench, and rbd bench to validate throughput and latency.

---

## Overview

Running Ceph on Proxmox is a popular choice for hyperconverged infrastructure. Before trusting production workloads to your cluster, benchmarking is essential. This guide walks through measuring IOPS, throughput, and latency using standard tools.

## Prerequisites

- Proxmox cluster with Ceph installed
- SSH access to a Ceph node
- `fio` installed on test nodes

## Using rados bench for Object Store Testing

`rados bench` is built into Ceph and is the simplest starting point.

```bash
# Write test - 30 seconds, 4MB objects, 16 concurrent threads
rados bench -p benchpool 30 write --no-cleanup -t 16

# Sequential read test
rados bench -p benchpool 30 seq -t 16

# Random read test
rados bench -p benchpool 30 rand -t 16

# Cleanup after testing
rados -p benchpool cleanup
```

Create the benchmark pool first:

```bash
ceph osd pool create benchpool 32 32
ceph osd pool application enable benchpool rbd
```

## Using rbd bench for Block Storage

For block device benchmarks closer to VM workloads:

```bash
# Create a test image
rbd create --size 10G benchpool/testimage

# Run sequential write benchmark
rbd bench --io-type write --io-size 4096 --io-threads 16 --io-total 1G benchpool/testimage

# Run random read benchmark
rbd bench --io-type read --io-size 4096 --io-threads 16 --io-total 1G --io-pattern rand benchpool/testimage
```

## Using fio for Advanced Benchmarks

`fio` gives the most realistic results for VM workloads. Run it from a Proxmox VM or container that uses Ceph storage:

```bash
# Random 4K read/write mix (70/30) - typical database workload
fio --name=ceph-bench \
    --filename=/mnt/ceph-test/testfile \
    --ioengine=libaio \
    --direct=1 \
    --rw=randrw \
    --rwmixread=70 \
    --bs=4k \
    --numjobs=4 \
    --iodepth=32 \
    --size=4G \
    --runtime=60 \
    --time_based \
    --output-format=json \
    --output=/tmp/fio-results.json
```

## Proxmox-Specific Considerations

Check Ceph health before benchmarking:

```bash
ceph status
ceph osd perf
ceph osd df
```

Monitor OSD performance during the test:

```bash
# Watch OSD commit latency live
ceph osd perf | sort -k3 -n | tail -10
```

Proxmox Ceph uses a public and cluster network. Ensure your cluster network is on a dedicated interface (10GbE or faster) for accurate results:

```bash
# Check network config in Proxmox
cat /etc/ceph/ceph.conf | grep network
```

## Interpreting Results

Key metrics to capture:

- Sequential write throughput (MiB/s)
- Random 4K IOPS (read and write)
- Average commit latency (ms)
- 99th percentile latency (p99)

A well-tuned 3-node Ceph cluster on 10GbE with SSD OSDs should deliver 200-500 MiB/s sequential and 10,000-50,000 4K IOPS depending on replication factor.

## Summary

Benchmarking Ceph in Proxmox involves using rados bench for object-level testing, rbd bench for block device validation, and fio for realistic VM workload simulation. Always benchmark before production deployment and after any hardware or configuration changes to establish a performance baseline.
