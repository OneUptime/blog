# How to Use fio for I/O Performance Benchmarking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Fio, Benchmarking, Storage, Performance

Description: Learn to use fio (Flexible I/O Tester) on Ubuntu to measure disk and storage performance with realistic workloads covering IOPS, throughput, and latency.

---

fio (Flexible I/O Tester) is the most capable open-source storage benchmarking tool available. It can simulate virtually any I/O workload - sequential reads and writes, random 4K IOPS, mixed read/write ratios, multi-threaded access, direct I/O bypassing page cache, and more. System administrators use it to characterize storage performance before deploying databases, evaluate storage arrays, and compare different I/O schedulers.

## Installing fio

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install fio -y

# Verify version
fio --version
```

## Understanding fio Concepts

Before running benchmarks, understand the key parameters:

- **ioengine**: How fio performs I/O (sync, libaio, io_uring, etc.)
- **rw**: I/O pattern (read, write, randread, randwrite, randrw)
- **bs**: Block size for each I/O operation
- **numjobs**: Number of concurrent threads
- **iodepth**: Queue depth (relevant for async I/O engines)
- **direct=1**: Bypass page cache - measures raw device performance
- **size**: Total amount of data to read/write per job
- **runtime**: Alternative to size - run for a fixed time duration

## Test 1: Sequential Read Throughput

Sequential read speed determines how fast large files can be read:

```bash
# Measure sequential read throughput
# Tests raw storage speed bypassing page cache
fio \
    --name=sequential_read \
    --ioengine=libaio \
    --rw=read \
    --bs=1M \
    --direct=1 \
    --numjobs=1 \
    --iodepth=32 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --output-format=normal \
    --group_reporting
```

Expected output shows:
- `READ: bw=...MB/s` - throughput
- `IOPS=...` - I/O operations per second
- `lat (msec): avg=...` - average latency

## Test 2: Sequential Write Throughput

```bash
# Measure sequential write throughput
fio \
    --name=sequential_write \
    --ioengine=libaio \
    --rw=write \
    --bs=1M \
    --direct=1 \
    --numjobs=1 \
    --iodepth=32 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --output-format=normal \
    --group_reporting
```

## Test 3: Random Read IOPS (4K)

4K random reads are the critical benchmark for databases and general-purpose workloads:

```bash
# 4K random read IOPS test - critical for database performance
fio \
    --name=rand_read_4k \
    --ioengine=libaio \
    --rw=randread \
    --bs=4K \
    --direct=1 \
    --numjobs=4 \
    --iodepth=64 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --runtime=60 \
    --time_based \
    --output-format=normal \
    --group_reporting
```

Typical values:
- HDD: 100-200 IOPS
- SATA SSD: 50,000-100,000 IOPS
- NVMe SSD: 500,000-1,000,000+ IOPS

## Test 4: Random Write IOPS (4K)

```bash
# 4K random write IOPS test
fio \
    --name=rand_write_4k \
    --ioengine=libaio \
    --rw=randwrite \
    --bs=4K \
    --direct=1 \
    --numjobs=4 \
    --iodepth=64 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --runtime=60 \
    --time_based \
    --output-format=normal \
    --group_reporting
```

## Test 5: Mixed Read/Write (Database Simulation)

A 70/30 read/write mix simulates typical database workloads:

```bash
# Mixed 70% read / 30% write - realistic database workload
fio \
    --name=mixed_rw \
    --ioengine=libaio \
    --rw=randrw \
    --rwmixread=70 \
    --bs=4K \
    --direct=1 \
    --numjobs=4 \
    --iodepth=32 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --runtime=60 \
    --time_based \
    --output-format=normal \
    --group_reporting
```

## Using fio Job Files

For repeatability and complex scenarios, define tests in a job file:

```bash
nano /tmp/storage_benchmark.fio
```

```ini
# fio job file: storage_benchmark.fio
# Comprehensive storage benchmark suite

# Global settings applied to all jobs
[global]
ioengine=libaio
direct=1
time_based=1
runtime=60
filename=/tmp/fio_test_file
group_reporting

# Job 1: Sequential read throughput
[seqread]
rw=read
bs=1M
numjobs=1
iodepth=8
new_group

# Job 2: Sequential write throughput
[seqwrite]
rw=write
bs=1M
numjobs=1
iodepth=8
new_group

# Job 3: 4K random read IOPS
[randread_4k]
rw=randread
bs=4K
numjobs=4
iodepth=64
new_group

# Job 4: 4K random write IOPS
[randwrite_4k]
rw=randwrite
bs=4K
numjobs=4
iodepth=64
new_group

# Job 5: Mixed 70/30 workload
[mixed_db]
rw=randrw
rwmixread=70
bs=4K
numjobs=4
iodepth=32
new_group
```

```bash
# Run the job file
fio /tmp/storage_benchmark.fio
```

## Testing a Specific Device

To test a raw block device (bypasses the filesystem entirely):

```bash
# WARNING: This writes directly to the device - use an unmounted, empty device only
# Do NOT use your system drive

# Test raw device performance
sudo fio \
    --name=raw_device_test \
    --ioengine=libaio \
    --rw=randread \
    --bs=4K \
    --direct=1 \
    --numjobs=1 \
    --iodepth=32 \
    --filename=/dev/sdb \    # Replace with your target device
    --runtime=60 \
    --time_based \
    --readonly         # Safety flag: prevents accidental writes
```

## Using io_uring for Modern Kernels

io_uring is the newest and most efficient async I/O engine on Linux 5.1+:

```bash
# Check if io_uring is available
fio --enghelp=io_uring 2>&1 | head -5

# Use io_uring engine for better performance on modern kernels
fio \
    --name=iouring_test \
    --ioengine=io_uring \
    --rw=randread \
    --bs=4K \
    --direct=1 \
    --numjobs=4 \
    --iodepth=128 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --runtime=60 \
    --time_based \
    --output-format=normal \
    --group_reporting
```

## Measuring Latency Distribution

For latency-sensitive workloads, view the full latency distribution:

```bash
# Enable latency histogram output
fio \
    --name=latency_test \
    --ioengine=libaio \
    --rw=randread \
    --bs=4K \
    --direct=1 \
    --numjobs=1 \
    --iodepth=1 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --runtime=60 \
    --time_based \
    --lat_percentiles=1 \
    --clat_percentiles=1 \
    --percentile_list=50,75,90,95,99,99.9,99.99
```

The output shows latency at each percentile:
```text
clat percentiles (usec):
 |  1.00th=[   81],  5.00th=[   97],
 | 10.00th=[  108], 20.00th=[  125],
 | 50.00th=[  185], 75.00th=[  260],
 | 90.00th=[  343], 95.00th=[  400],
 | 99.00th=[  660], 99.50th=[  816],
 | 99.90th=[ 2245], 99.99th=[ 7898]
```

The 99th percentile (p99) latency is most important for database workloads.

## Saving Results to JSON

```bash
# Output results in JSON format for programmatic analysis
fio \
    --name=json_test \
    --ioengine=libaio \
    --rw=randread \
    --bs=4K \
    --direct=1 \
    --numjobs=4 \
    --iodepth=64 \
    --size=4G \
    --filename=/tmp/fio_test_file \
    --runtime=60 \
    --time_based \
    --output-format=json \
    --output=/tmp/fio_results.json

# Parse results with jq
cat /tmp/fio_results.json | jq '.jobs[0].read.iops'
cat /tmp/fio_results.json | jq '.jobs[0].read.bw'
cat /tmp/fio_results.json | jq '.jobs[0].read.lat_ns.mean'
```

## Quick Benchmark Script

```bash
#!/bin/bash
# quick_storage_benchmark.sh - Run standard storage tests and summarize

TESTFILE="/tmp/fio_benchmark_$$"
RUNTIME=30  # Seconds per test

echo "=== Storage Benchmark ==="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "Test file: $TESTFILE"
echo ""

run_test() {
    local name="$1"
    local rw="$2"
    local bs="$3"
    local numjobs="$4"
    local iodepth="$5"

    result=$(fio \
        --name="$name" \
        --ioengine=libaio \
        --rw="$rw" \
        --bs="$bs" \
        --direct=1 \
        --numjobs="$numjobs" \
        --iodepth="$iodepth" \
        --size=2G \
        --filename="$TESTFILE" \
        --runtime="$RUNTIME" \
        --time_based \
        --output-format=json \
        --group_reporting 2>/dev/null)

    read_bw=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['jobs'][0]['read']['bw_bytes']//1024//1024)" 2>/dev/null)
    read_iops=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['jobs'][0]['read']['iops']))" 2>/dev/null)
    write_bw=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['jobs'][0]['write']['bw_bytes']//1024//1024)" 2>/dev/null)
    write_iops=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['jobs'][0]['write']['iops']))" 2>/dev/null)

    printf "%-25s Read: %6d MB/s  %8d IOPS  |  Write: %6d MB/s  %8d IOPS\n" \
        "$name:" "${read_bw:-0}" "${read_iops:-0}" "${write_bw:-0}" "${write_iops:-0}"
}

run_test "Seq Read (1M bs)" "read" "1M" 1 8
run_test "Seq Write (1M bs)" "write" "1M" 1 8
run_test "Rand Read 4K" "randread" "4K" 4 64
run_test "Rand Write 4K" "randwrite" "4K" 4 64
run_test "Mixed 70/30 4K" "randrw" "4K" 4 32

# Clean up test file
rm -f "$TESTFILE"
echo ""
echo "Benchmark complete"
```

```bash
chmod +x quick_storage_benchmark.sh
./quick_storage_benchmark.sh
```

## Interpreting Results

When evaluating storage for specific workloads:

- **File servers**: Sequential read throughput matters most (large file streaming)
- **Databases**: 4K random read IOPS and p99 latency are most critical
- **Log aggregation**: Sequential write throughput dominates
- **Virtual machines**: Mixed workload with 8K or 16K block sizes is realistic
- **NVMe evaluation**: Use io_uring with high iodepth to saturate the device

fio gives you the numbers you need to make informed decisions about storage hardware and configuration. Run tests with realistic workloads that match your actual use case rather than just chasing headline sequential throughput numbers.
