# How to Use fio for Storage Benchmarking and Performance Testing on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Fio, Benchmarking, Storage, Performance, Linux

Description: Learn how to use fio on RHEL to benchmark storage performance with realistic workload simulations and interpret the results accurately.

---

The `fio` (Flexible I/O Tester) tool is the industry standard for storage benchmarking on Linux. It can simulate virtually any I/O workload pattern, making it essential for evaluating storage performance, comparing configurations, and validating that tuning changes produce real improvements on RHEL.

## Installing fio

```bash
sudo dnf install fio
```

## Basic Concepts

fio uses job files or command-line parameters to define workloads. Key parameters include:

- **rw** - The I/O pattern (read, write, randread, randwrite, randrw, readwrite)
- **bs** - Block size for each I/O operation
- **size** - Total amount of data to read/write
- **direct** - Bypass the page cache (1 = direct I/O)
- **numjobs** - Number of parallel workers
- **runtime** - How long to run the test
- **iodepth** - Number of I/O operations to keep in flight

## Sequential Read Test

```bash
fio --name=seq-read --filename=/data/fio_test \
    --rw=read --bs=1M --size=4G --direct=1 \
    --numjobs=1 --runtime=60 --time_based \
    --group_reporting
```

## Sequential Write Test

```bash
fio --name=seq-write --filename=/data/fio_test \
    --rw=write --bs=1M --size=4G --direct=1 \
    --numjobs=1 --runtime=60 --time_based \
    --group_reporting
```

## Random Read Test (IOPS)

```bash
fio --name=rand-read --filename=/data/fio_test \
    --rw=randread --bs=4k --size=4G --direct=1 \
    --numjobs=4 --iodepth=32 --runtime=60 \
    --time_based --group_reporting
```

## Random Write Test (IOPS)

```bash
fio --name=rand-write --filename=/data/fio_test \
    --rw=randwrite --bs=4k --size=4G --direct=1 \
    --numjobs=4 --iodepth=32 --runtime=60 \
    --time_based --group_reporting
```

## Mixed Random Read/Write Test

Simulates a typical database workload with 70% reads and 30% writes:

```bash
fio --name=mixed-rw --filename=/data/fio_test \
    --rw=randrw --rwmixread=70 --bs=4k --size=4G \
    --direct=1 --numjobs=4 --iodepth=16 \
    --runtime=60 --time_based --group_reporting
```

## Understanding fio Output

Key metrics in fio results:

```text
  read: IOPS=45.2k, BW=176MiB/s (185MB/s)
    slat (usec): min=1, max=234, avg=3.42, stdev=2.10
    clat (usec): min=45, max=12345, avg=705.32, stdev=234.56
     lat (usec): min=48, max=12348, avg=708.74, stdev=234.89
```

- **IOPS** - Input/Output Operations Per Second
- **BW** - Bandwidth (throughput)
- **slat** - Submission latency (time to submit the I/O)
- **clat** - Completion latency (time from submission to completion)
- **lat** - Total latency (slat + clat)

Latency percentiles are crucial:

```text
    clat percentiles (usec):
     |  1.00th=[  155],  5.00th=[  210], 10.00th=[  260],
     | 20.00th=[  347], 30.00th=[  424], 40.00th=[  510],
     | 50.00th=[  603], 60.00th=[  717], 70.00th=[  848],
     | 80.00th=[ 1020], 90.00th=[ 1336], 95.00th=[ 1696],
     | 99.00th=[ 2769], 99.50th=[ 3458], 99.90th=[ 5800],
     | 99.95th=[ 7504], 99.99th=[10814]
```

The p99 latency (99th percentile) is often the most important metric for application performance.

## Using Job Files

For complex or repeatable tests, use job files:

```bash
cat > /tmp/database_workload.fio << 'FIOEOF'
[global]
filename=/data/fio_test
direct=1
time_based
runtime=120
group_reporting

[random-reads]
rw=randread
bs=8k
numjobs=4
iodepth=16

[sequential-writes]
rw=write
bs=64k
numjobs=2
iodepth=4
FIOEOF

fio /tmp/database_workload.fio
```

## Testing Specific Workloads

### Database Simulation

```bash
fio --name=database --filename=/data/fio_test \
    --rw=randrw --rwmixread=80 --bs=8k --size=8G \
    --direct=1 --numjobs=8 --iodepth=32 \
    --runtime=120 --time_based --group_reporting \
    --ioengine=libaio
```

### Web Server Simulation

```bash
fio --name=webserver --filename=/data/fio_test \
    --rw=randread --bs=4k --size=4G \
    --direct=1 --numjobs=16 --iodepth=64 \
    --runtime=120 --time_based --group_reporting \
    --ioengine=libaio
```

### Streaming Media Simulation

```bash
fio --name=streaming --filename=/data/fio_test \
    --rw=read --bs=256k --size=10G \
    --direct=1 --numjobs=4 --iodepth=4 \
    --runtime=120 --time_based --group_reporting
```

## JSON Output for Automated Analysis

```bash
fio --name=test --filename=/data/fio_test \
    --rw=randread --bs=4k --size=1G --direct=1 \
    --numjobs=4 --iodepth=32 --runtime=30 \
    --time_based --output-format=json --output=results.json
```

## Best Practices for Accurate Results

1. **Use direct I/O** (`--direct=1`) to bypass the page cache
2. **Pre-condition SSDs** by filling them with data before testing
3. **Run tests long enough** (at least 60 seconds) for stable results
4. **Use a dedicated test file** on the target file system
5. **Run multiple iterations** and average the results
6. **Test on idle systems** to avoid interference from other workloads
7. **Warm up the device** before the actual test

## Cleaning Up

```bash
rm -f /data/fio_test
```

## Summary

The `fio` tool is indispensable for storage performance testing on RHEL. Use sequential tests to measure throughput, random tests for IOPS, and mixed workloads for realistic application simulation. Focus on p99 latency for application-relevant metrics, use direct I/O for accurate results, and run tests long enough to capture steady-state performance. Always clean up test files after benchmarking.
