# How to Benchmark Ceph Storage Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Benchmarking, Performance, Storage, Testing

Description: Learn how to benchmark Ceph storage performance using rados bench, fio, and cosbench to measure throughput, IOPS, and latency for block, object, and file workloads.

---

## Why Benchmark Ceph?

Benchmarking establishes performance baselines, validates hardware purchases, and helps identify bottlenecks. Ceph performance varies significantly based on hardware, network, replication factor, and workload type. Running structured benchmarks before deploying production workloads prevents surprises.

## Using rados bench for Object Storage

The built-in `rados bench` tool tests raw object store performance:

```bash
# Write benchmark (4 MB objects, 30 seconds)
rados bench -p <pool-name> 30 write --no-cleanup -b 4M -t 16

# Sequential read benchmark
rados bench -p <pool-name> 30 seq -t 16

# Random read benchmark
rados bench -p <pool-name> 30 rand -t 16

# Clean up test objects after benchmarking
rados -p <pool-name> cleanup
```

Sample output interpretation:

```text
Total time run:         30.003
Total writes made:      1248
Write size:             4194304
Object size:            4194304
Bandwidth (MB/sec):     166.378
Stddev Bandwidth:       8.123
Max bandwidth (MB/sec): 178.000
Min bandwidth (MB/sec): 145.000
Average IOPS:           41
Stddev IOPS:            2
Max IOPS:               44
Min IOPS:               36
Average Latency(s):     0.384
```

## Using fio for Block Storage (RBD)

Install fio and the librbd engine:

```bash
dnf install -y fio   # RHEL/Rocky
apt install -y fio   # Ubuntu/Debian
```

Create an fio job file for RBD testing:

```ini
[global]
ioengine=rbd
clientname=admin
pool=replicapool
rbdname=fio-test
rw=randread
bs=4k
iodepth=64
numjobs=4
runtime=60
time_based=1
direct=1
group_reporting=1

[rbd-randread]
name=rbd-randread
```

Create the test image first:

```bash
rbd create replicapool/fio-test --size 10G
fio rbd-benchmark.fio
```

Common fio profiles:

```bash
# Sequential write throughput
fio --ioengine=rbd --pool=replicapool --rbdname=fio-test \
    --rw=write --bs=1M --numjobs=4 --iodepth=16 --runtime=60 \
    --time_based --name=seq-write --group_reporting

# Random read IOPS
fio --ioengine=rbd --pool=replicapool --rbdname=fio-test \
    --rw=randread --bs=4k --numjobs=8 --iodepth=128 --runtime=60 \
    --time_based --name=rand-read --group_reporting

# Mixed read/write (70/30)
fio --ioengine=rbd --pool=replicapool --rbdname=fio-test \
    --rw=randrw --rwmixread=70 --bs=4k --numjobs=4 --iodepth=64 \
    --runtime=60 --time_based --name=mixed --group_reporting
```

## Benchmarking CephFS with fio

Mount CephFS and run file-based benchmarks:

```bash
# Mount CephFS
mount -t ceph mon1:6789,mon2:6789:/ /mnt/cephfs \
    -o name=admin,secretfile=/etc/ceph/admin.secret

# Sequential write
fio --name=cephfs-seq-write --directory=/mnt/cephfs \
    --rw=write --bs=1M --size=10G --numjobs=4 --runtime=60 \
    --ioengine=libaio --direct=1 --group_reporting

# Random read
fio --name=cephfs-rand-read --directory=/mnt/cephfs \
    --rw=randread --bs=4k --size=4G --numjobs=8 --runtime=60 \
    --ioengine=libaio --direct=1 --group_reporting
```

## Running Benchmarks from Kubernetes

Deploy a benchmark pod in Rook environments:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ceph-benchmark
  namespace: rook-ceph
spec:
  containers:
  - name: fio
    image: nixery.dev/fio
    command: ["fio", "--name=bench", "--rw=randread",
              "--bs=4k", "--numjobs=4", "--iodepth=64",
              "--runtime=60", "--filename=/data/testfile",
              "--ioengine=libaio", "--direct=1", "--size=4G"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: benchmark-pvc
  restartPolicy: Never
```

## Analyzing Results

Key metrics to track across benchmark runs:

- **IOPS**: Operations per second for random I/O (4k blocks)
- **Throughput**: MB/s for sequential I/O (1M blocks)
- **Latency p99**: 99th percentile latency for tail latency analysis
- **Latency p999**: 99.9th percentile for worst-case scenarios

## Summary

Comprehensive Ceph benchmarking requires testing multiple layers: raw object store with `rados bench`, block devices with `fio + librbd`, and CephFS with POSIX file benchmarks. Capturing baseline results before cluster changes and comparing after tuning provides quantitative evidence of performance improvements. Always run benchmarks at realistic concurrency levels matching your production workloads.
