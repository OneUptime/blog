# How to Benchmark VDO Deduplication and Compression on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Benchmarking, Deduplication, Compression, Storage, Linux

Description: Learn how to benchmark VDO deduplication and compression on RHEL 9 using synthetic and real-world data, measuring space savings, throughput impact, and latency characteristics.

---

Before deploying VDO in production, benchmarking helps you understand the actual space savings and performance characteristics for your specific workload. This guide covers how to systematically benchmark VDO deduplication and compression on RHEL 9, comparing VDO performance against standard LVM volumes.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Two similar block devices (one for VDO, one for baseline comparison)
- The `lvm2`, `kmod-kvdo`, and `fio` packages installed

```bash
sudo dnf install lvm2 kmod-kvdo fio -y
```

## Step 1: Set Up Test Volumes

Create both a VDO volume and a standard LVM volume for comparison:

### Standard LVM Volume (Baseline)

```bash
sudo pvcreate /dev/sdb
sudo vgcreate vg_baseline /dev/sdb
sudo lvcreate -L 80G -n lv_baseline vg_baseline
sudo mkfs.xfs /dev/vg_baseline/lv_baseline
sudo mkdir -p /mnt/baseline
sudo mount /dev/vg_baseline/lv_baseline /mnt/baseline
```

### VDO Volume

```bash
sudo pvcreate /dev/sdc
sudo vgcreate vg_vdo /dev/sdc
sudo lvcreate --type vdo --name lv_vdo --size 80G --virtualsize 240G vg_vdo
sudo mkfs.xfs -K /dev/vg_vdo/lv_vdo
sudo mkdir -p /mnt/vdo
sudo mount -o discard /dev/vg_vdo/lv_vdo /mnt/vdo
```

## Step 2: Benchmark Deduplication with Synthetic Data

### Test 1: 100% Duplicate Data

Write the same data multiple times to measure maximum deduplication:

```bash
# Create a 1GB reference file
dd if=/dev/urandom of=/tmp/reference.dat bs=1M count=1024

# Write 10 copies to VDO
for i in $(seq 1 10); do
    cp /tmp/reference.dat /mnt/vdo/copy_${i}.dat
done

# Check savings
sudo vdostats --human-readable
```

Expected result: approximately 90% savings (10:1 deduplication).

### Test 2: 50% Duplicate Data

```bash
# Write 5 copies of the reference file
for i in $(seq 1 5); do
    cp /tmp/reference.dat /mnt/vdo/dup_${i}.dat
done

# Write 5 unique files
for i in $(seq 1 5); do
    dd if=/dev/urandom of=/mnt/vdo/unique_${i}.dat bs=1M count=1024
done

# Check savings
sudo vdostats --human-readable
```

### Test 3: No Duplicate Data

```bash
# Write entirely unique random data
dd if=/dev/urandom of=/mnt/vdo/random.dat bs=1M count=5120

# Check savings (should be minimal)
sudo vdostats --human-readable
```

## Step 3: Benchmark Compression with Different Data Types

### Test Compressible Data

```bash
# Generate highly compressible data (text)
for i in $(seq 1 100); do
    head -c 10M /dev/zero | tr '\0' 'A' >> /mnt/vdo/text_data.txt
done

sudo vdostats --human-readable
```

### Test Incompressible Data

```bash
# Random data does not compress
dd if=/dev/urandom of=/mnt/vdo/random_nocompress.dat bs=1M count=2048

sudo vdostats --human-readable
```

### Test Real-World Data

Copy actual representative data from your workload:

```bash
# Example: copy a set of VM images
cp /path/to/vm-images/*.qcow2 /mnt/vdo/

sudo vdostats --human-readable
```

## Step 4: Benchmark I/O Performance

### Sequential Write Throughput

```bash
# Baseline (standard LVM)
sudo fio --name=seq_write --directory=/mnt/baseline --rw=write --bs=1M \
  --size=4G --numjobs=1 --runtime=60 --time_based --group_reporting \
  --output=/tmp/baseline_seq_write.json --output-format=json

# VDO
sudo fio --name=seq_write --directory=/mnt/vdo --rw=write --bs=1M \
  --size=4G --numjobs=1 --runtime=60 --time_based --group_reporting \
  --output=/tmp/vdo_seq_write.json --output-format=json
```

### Sequential Read Throughput

```bash
# Baseline
sudo fio --name=seq_read --directory=/mnt/baseline --rw=read --bs=1M \
  --size=4G --numjobs=1 --runtime=60 --time_based --group_reporting \
  --output=/tmp/baseline_seq_read.json --output-format=json

# VDO
sudo fio --name=seq_read --directory=/mnt/vdo --rw=read --bs=1M \
  --size=4G --numjobs=1 --runtime=60 --time_based --group_reporting \
  --output=/tmp/vdo_seq_read.json --output-format=json
```

### Random 4K Read IOPS

```bash
# Baseline
sudo fio --name=rand_read --directory=/mnt/baseline --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting \
  --output=/tmp/baseline_rand_read.json --output-format=json

# VDO
sudo fio --name=rand_read --directory=/mnt/vdo --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting \
  --output=/tmp/vdo_rand_read.json --output-format=json
```

### Random 4K Write IOPS

```bash
# Baseline
sudo fio --name=rand_write --directory=/mnt/baseline --rw=randwrite --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting \
  --output=/tmp/baseline_rand_write.json --output-format=json

# VDO
sudo fio --name=rand_write --directory=/mnt/vdo --rw=randwrite --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting \
  --output=/tmp/vdo_rand_write.json --output-format=json
```

### Mixed Workload (70% Read, 30% Write)

```bash
# Baseline
sudo fio --name=mixed --directory=/mnt/baseline --rw=randrw --rwmixread=70 --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting \
  --output=/tmp/baseline_mixed.json --output-format=json

# VDO
sudo fio --name=mixed --directory=/mnt/vdo --rw=randrw --rwmixread=70 --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting \
  --output=/tmp/vdo_mixed.json --output-format=json
```

## Step 5: Benchmark Latency

Measure write latency:

```bash
# Baseline
sudo fio --name=latency --directory=/mnt/baseline --rw=randwrite --bs=4K \
  --size=1G --numjobs=1 --runtime=60 --time_based \
  --lat_percentiles=1 --group_reporting

# VDO
sudo fio --name=latency --directory=/mnt/vdo --rw=randwrite --bs=4K \
  --size=1G --numjobs=1 --runtime=60 --time_based \
  --lat_percentiles=1 --group_reporting
```

Pay attention to the 99th and 99.9th percentile latencies, as VDO can add latency spikes during deduplication index lookups.

## Step 6: Benchmark with Deduplication-Friendly Workload

Test how VDO handles data that deduplicates well during active I/O:

```bash
# Create a file with repeating patterns
dd if=/dev/zero bs=1M count=1024 | tr '\0' '\x41' > /tmp/pattern.dat

# Write multiple copies while measuring throughput
time for i in $(seq 1 10); do
    cp /tmp/pattern.dat /mnt/vdo/pattern_${i}.dat
done

# Check effective write rate and savings
sudo vdostats --human-readable
```

## Step 7: Analyze and Compare Results

Create a summary table:

```bash
echo "=== Sequential Write Throughput ==="
echo "Baseline: $(jq '.jobs[0].write.bw_mean' /tmp/baseline_seq_write.json) KB/s"
echo "VDO:      $(jq '.jobs[0].write.bw_mean' /tmp/vdo_seq_write.json) KB/s"

echo ""
echo "=== Random Read IOPS ==="
echo "Baseline: $(jq '.jobs[0].read.iops_mean' /tmp/baseline_rand_read.json)"
echo "VDO:      $(jq '.jobs[0].read.iops_mean' /tmp/vdo_rand_read.json)"

echo ""
echo "=== Space Savings ==="
sudo vdostats --human-readable
```

## Expected Performance Impact

| Metric | Typical VDO Overhead |
|--------|---------------------|
| Sequential write throughput | 10-30% reduction |
| Sequential read throughput | 5-15% reduction |
| Random write IOPS | 15-40% reduction |
| Random read IOPS | 5-20% reduction |
| Write latency (p99) | 20-50% increase |
| Read latency (p99) | 5-15% increase |

These numbers vary significantly based on:
- CPU power (AES-NI, core count)
- VDO tuning parameters
- Data deduplication ratio
- Storage device speed

## Step 8: Clean Up

After benchmarking:

```bash
sudo umount /mnt/baseline /mnt/vdo
sudo lvremove -f vg_baseline/lv_baseline vg_vdo/lv_vdo
sudo vgremove vg_baseline vg_vdo
sudo pvremove /dev/sdb /dev/sdc
```

## Making the Decision

VDO is worthwhile when:
- Space savings exceed 2:1 (the performance overhead is justified)
- Storage cost savings outweigh performance impact
- Your workload is not latency-sensitive at the microsecond level
- You have sufficient CPU and memory resources

VDO may not be worthwhile when:
- Data is already compressed or encrypted
- Sub-millisecond latency is critical
- Deduplication savings are below 1.5:1
- CPU or memory resources are severely constrained

## Conclusion

Benchmarking VDO on RHEL 9 with both synthetic and representative data gives you concrete numbers for making deployment decisions. By comparing VDO volumes against standard LVM volumes across throughput, IOPS, and latency metrics, you can quantify the performance trade-off against the space savings. Use these benchmark results to choose appropriate VDO configurations and set realistic performance expectations for production deployments.
