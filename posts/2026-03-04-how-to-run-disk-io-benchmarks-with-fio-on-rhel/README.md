# How to Run Disk I/O Benchmarks with fio on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fio, Disk I/O, Benchmarking, Performance, Storage

Description: Learn how to use fio on RHEL to benchmark disk I/O performance, including sequential and random read/write tests.

---

fio (Flexible I/O Tester) is the standard tool for disk benchmarking on Linux. It can simulate a wide range of I/O workloads to help you understand storage performance.

## Installing fio

```bash
# Install fio from the base RHEL repository
sudo dnf install -y fio
```

## Sequential Read/Write Test

```bash
# Sequential write test - 1GB file, 1MB block size
fio --name=seq-write \
  --ioengine=libaio \
  --rw=write \
  --bs=1M \
  --direct=1 \
  --size=1G \
  --numjobs=1 \
  --runtime=60 \
  --time_based \
  --filename=/tmp/fio-test

# Sequential read test
fio --name=seq-read \
  --ioengine=libaio \
  --rw=read \
  --bs=1M \
  --direct=1 \
  --size=1G \
  --numjobs=1 \
  --runtime=60 \
  --time_based \
  --filename=/tmp/fio-test
```

## Random Read/Write Test

```bash
# Random 4K write test (simulates database workload)
fio --name=rand-write \
  --ioengine=libaio \
  --rw=randwrite \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --time_based \
  --filename=/tmp/fio-test

# Random 4K read test
fio --name=rand-read \
  --ioengine=libaio \
  --rw=randread \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --time_based \
  --filename=/tmp/fio-test
```

## Mixed Read/Write Workload

```bash
# 70% read, 30% write mixed workload
fio --name=mixed-rw \
  --ioengine=libaio \
  --rw=randrw \
  --rwmixread=70 \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --time_based \
  --filename=/tmp/fio-test
```

## Using a Job File

For repeatable tests, create a job file:

```ini
# Save as /tmp/fio-job.ini
[global]
ioengine=libaio
direct=1
size=1G
runtime=60
time_based

[seq-write]
rw=write
bs=1M

[rand-read]
rw=randread
bs=4k
iodepth=32
numjobs=4
```

```bash
# Run the job file
fio /tmp/fio-job.ini
```

Key metrics from fio output include IOPS (I/O operations per second), bandwidth (MB/s), and latency (average, P99, P99.9). Always use `--direct=1` to bypass the OS page cache for accurate storage benchmarks. Clean up test files after benchmarking with `rm /tmp/fio-test`.
