# How to Benchmark VDO Deduplication and Compression on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Benchmarking, Deduplication, Compression, Storage, Linux

Description: Learn how to benchmark VDO deduplication and compression performance on RHEL to measure space savings, throughput, and latency for your specific workloads.

---

Before deploying VDO in production, benchmarking helps you understand the space savings, throughput, and latency characteristics for your specific data. This guide walks through practical benchmarking methods on RHEL.

## Setting Up a Test VDO Volume

```bash
# Install VDO and benchmarking tools
sudo dnf install -y vdo kmod-kvdo fio

# Create a test VDO volume
sudo vdo create --name=vdo-bench \
  --device=/dev/sdb \
  --vdoLogicalSize=200G

# Format and mount
sudo mkfs.xfs -K /dev/mapper/vdo-bench
sudo mkdir -p /mnt/vdo-bench
sudo mount /dev/mapper/vdo-bench /mnt/vdo-bench
```

## Benchmarking Deduplication

Write duplicate data and measure space savings:

```bash
# Create a 1GB reference file with random data
dd if=/dev/urandom of=/mnt/vdo-bench/reference.dat bs=1M count=1024

# Copy it multiple times to simulate deduplication opportunities
for i in $(seq 1 10); do
    cp /mnt/vdo-bench/reference.dat /mnt/vdo-bench/copy_${i}.dat
done

# Sync to ensure data is flushed
sync

# Check deduplication savings
sudo vdostats --human-readable
# The space saving percentage should be high since copies are identical
```

## Benchmarking Compression

```bash
# Write highly compressible data (text, logs, etc.)
for i in $(seq 1 5); do
    dd if=/dev/zero bs=1M count=1024 | tr '\0' 'A' > /mnt/vdo-bench/compressible_${i}.dat
done
sync

# Check compression savings
sudo vdostats --verbose /dev/mapper/vdo-bench | grep "saving percent"
```

## Benchmarking Throughput with fio

```bash
# Sequential write throughput
sudo fio --name=seq-write --ioengine=libaio --iodepth=16 \
  --rw=write --bs=128k --size=4G --numjobs=1 \
  --filename=/mnt/vdo-bench/fio-test --direct=1 \
  --output=/tmp/vdo-seq-write.json --output-format=json

# Sequential read throughput
sudo fio --name=seq-read --ioengine=libaio --iodepth=16 \
  --rw=read --bs=128k --size=4G --numjobs=1 \
  --filename=/mnt/vdo-bench/fio-test --direct=1

# Random 4K write IOPS (typical database workload)
sudo fio --name=rand-write --ioengine=libaio --iodepth=32 \
  --rw=randwrite --bs=4k --size=2G --numjobs=4 \
  --filename=/mnt/vdo-bench/fio-rand --direct=1
```

## Comparing VDO vs Raw Device

```bash
# Benchmark raw device without VDO for comparison
sudo fio --name=raw-write --ioengine=libaio --iodepth=16 \
  --rw=write --bs=128k --size=4G --numjobs=1 \
  --filename=/dev/sdc --direct=1

# Compare IOPS and latency between VDO and raw results
```

## Cleanup

```bash
sudo umount /mnt/vdo-bench
sudo vdo remove --name=vdo-bench
```

Record your benchmark results for different data types. The overhead of VDO is typically 10-20% for write throughput and minimal for reads. The space savings often more than compensate for the performance cost.
