# How to Run Disk I/O Benchmarks with fio on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Benchmarking

Description: Step-by-step guide on run disk i/o benchmarks with fio on rhel 9 with practical examples and commands.

---

fio (Flexible I/O Tester) is the standard tool for disk I/O benchmarking on RHEL 9.

## Install fio

```bash
sudo dnf install -y fio
```

## Sequential Read Benchmark

```bash
fio --name=seq-read \
  --ioengine=libaio \
  --direct=1 \
  --rw=read \
  --bs=1M \
  --numjobs=4 \
  --size=4G \
  --runtime=60 \
  --group_reporting \
  --filename=/mnt/test/fio-test
```

## Sequential Write Benchmark

```bash
fio --name=seq-write \
  --ioengine=libaio \
  --direct=1 \
  --rw=write \
  --bs=1M \
  --numjobs=4 \
  --size=4G \
  --runtime=60 \
  --group_reporting \
  --filename=/mnt/test/fio-test
```

## Random Read IOPS

```bash
fio --name=rand-read \
  --ioengine=libaio \
  --direct=1 \
  --rw=randread \
  --bs=4K \
  --numjobs=8 \
  --iodepth=32 \
  --size=1G \
  --runtime=60 \
  --group_reporting \
  --filename=/mnt/test/fio-test
```

## Random Write IOPS

```bash
fio --name=rand-write \
  --ioengine=libaio \
  --direct=1 \
  --rw=randwrite \
  --bs=4K \
  --numjobs=8 \
  --iodepth=32 \
  --size=1G \
  --runtime=60 \
  --group_reporting \
  --filename=/mnt/test/fio-test
```

## Mixed Read/Write Workload

```bash
fio --name=mixed \
  --ioengine=libaio \
  --direct=1 \
  --rw=randrw \
  --rwmixread=70 \
  --bs=4K \
  --numjobs=8 \
  --iodepth=32 \
  --size=1G \
  --runtime=60 \
  --group_reporting \
  --filename=/mnt/test/fio-test
```

## Key Metrics

- **Bandwidth (BW)**: MB/s for sequential operations
- **IOPS**: Operations per second for random operations
- **Latency**: Average and percentile response times

## Conclusion

fio on RHEL 9 provides comprehensive disk I/O benchmarking. Test sequential and random workloads that match your application patterns to make informed storage decisions.

