# How to Use fio for Ceph Block Storage Benchmarking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Benchmarking, Fio, RBD, Performance

Description: Learn how to use fio with the librbd engine to benchmark Ceph block storage, testing sequential throughput, random IOPS, mixed workloads, and latency percentiles.

---

## Why Use fio for Ceph RBD

fio (Flexible I/O Tester) is the industry standard for storage benchmarking. Its native `rbd` ioengine bypasses the OS block layer and talks directly to Ceph's librbd library, giving pure Ceph performance numbers unaffected by kernel I/O schedulers or page cache effects.

## Installing fio with RBD Support

```bash
# RHEL/Rocky - includes librbd engine
dnf install -y fio

# Ubuntu/Debian
apt install -y fio

# Verify RBD engine is available
fio --enghelp | grep rbd
fio --ioengine=rbd --help 2>&1 | head -5
```

If the rbd engine is missing, compile fio from source with librbd:

```bash
dnf install -y librados-devel librbd-devel
git clone https://github.com/axboe/fio
cd fio && ./configure && make -j4 && make install
```

## Creating a Test Image

Always test on a dedicated image to avoid impacting production data:

```bash
# Create test pool and image
ceph osd pool create fio-test-pool 64 64
rbd create fio-test-pool/fio-image --size 20G

# Verify image exists
rbd info fio-test-pool/fio-image
```

## Common fio Benchmark Profiles

### Sequential Write Throughput

```bash
fio --name=seq-write \
    --ioengine=rbd \
    --pool=fio-test-pool \
    --rbdname=fio-image \
    --rw=write \
    --bs=1M \
    --numjobs=4 \
    --iodepth=16 \
    --runtime=60 \
    --time_based=1 \
    --group_reporting
```

### Sequential Read Throughput

```bash
fio --name=seq-read \
    --ioengine=rbd \
    --pool=fio-test-pool \
    --rbdname=fio-image \
    --rw=read \
    --bs=1M \
    --numjobs=4 \
    --iodepth=16 \
    --runtime=60 \
    --time_based=1 \
    --group_reporting
```

### Random Read IOPS

```bash
fio --name=rand-read \
    --ioengine=rbd \
    --pool=fio-test-pool \
    --rbdname=fio-image \
    --rw=randread \
    --bs=4k \
    --numjobs=8 \
    --iodepth=128 \
    --runtime=60 \
    --time_based=1 \
    --group_reporting
```

### Random Write IOPS

```bash
fio --name=rand-write \
    --ioengine=rbd \
    --pool=fio-test-pool \
    --rbdname=fio-image \
    --rw=randwrite \
    --bs=4k \
    --numjobs=8 \
    --iodepth=128 \
    --runtime=60 \
    --time_based=1 \
    --group_reporting
```

## Using fio Job Files

Create a reusable job file for consistent benchmarking:

```ini
[global]
ioengine=rbd
clientname=admin
pool=fio-test-pool
rbdname=fio-image
time_based=1
runtime=60
group_reporting=1
iodepth=128

[seq-write]
rw=write
bs=1M
numjobs=4
iodepth=16

[rand-read-iops]
rw=randread
bs=4k
numjobs=8

[rand-write-iops]
rw=randwrite
bs=4k
numjobs=8
```

Run all jobs:

```bash
fio ceph-rbd-benchmark.fio
```

## Capturing Latency Percentiles

fio can collect latency percentiles for tail latency analysis:

```bash
fio --name=lat-profile \
    --ioengine=rbd \
    --pool=fio-test-pool \
    --rbdname=fio-image \
    --rw=randread \
    --bs=4k \
    --numjobs=4 \
    --iodepth=32 \
    --runtime=60 \
    --lat_percentiles=1 \
    --percentile_list=50:90:95:99:99.9:99.99
```

Sample latency output:

```text
lat (usec): min=180, max=28441, avg=1842.33
  50.00th=[ 1434],
  90.00th=[ 2900],
  95.00th=[ 3696],
  99.00th=[ 6980],
  99.90th=[15664],
  99.99th=[27264]
```

## Running fio Inside Kubernetes

Deploy fio as a Kubernetes Job against a Rook PVC:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-benchmark
  namespace: default
spec:
  template:
    spec:
      containers:
      - name: fio
        image: nixery.dev/fio
        command:
        - fio
        - --name=bench
        - --rw=randrw
        - --bs=4k
        - --rwmixread=70
        - --numjobs=4
        - --iodepth=64
        - --runtime=120
        - --filename=/data/testfile
        - --ioengine=libaio
        - --direct=1
        - --size=10G
        - --group_reporting
        - --lat_percentiles=1
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: fio-benchmark-pvc
      restartPolicy: Never
```

## Cleanup After Testing

```bash
rbd rm fio-test-pool/fio-image
ceph osd pool delete fio-test-pool fio-test-pool --yes-i-really-really-mean-it
```

## Summary

fio with the native librbd ioengine is the most accurate way to benchmark Ceph block storage performance, bypassing OS caching for pure Ceph measurements. Key test profiles cover sequential throughput (1 MB blocks), random IOPS (4k blocks), and mixed workloads. Capturing latency percentiles at P99 and P999 reveals tail latency behavior that averages hide, providing a complete performance picture for production workload planning.
