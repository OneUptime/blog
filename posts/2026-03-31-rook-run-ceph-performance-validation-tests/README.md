# How to Run Ceph Performance Validation Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Performance, Benchmark, Validation

Description: Validate Ceph cluster performance using rados bench, rbd bench, and fio to establish baselines and detect regressions before and after cluster changes.

---

Performance validation tests give you objective data about your Ceph cluster's capabilities. Running them before and after configuration changes, hardware additions, or upgrades allows you to detect regressions and confirm improvements.

## Prerequisites

Use the Rook toolbox or a dedicated test client with access to the Ceph cluster:

```bash
TOOLBOX=$(kubectl get pod -n rook-ceph -l app=rook-ceph-tools -o name | head -1)
alias ceph-exec="kubectl exec -n rook-ceph $TOOLBOX --"
```

## RADOS Bench - Object Storage Performance

RADOS bench directly tests the underlying object storage:

```bash
# Sequential write test (30 seconds)
ceph-exec rados bench -p replicapool 30 write --no-cleanup -t 16 -b 4096

# Sequential read test
ceph-exec rados bench -p replicapool 30 seq -t 16

# Random read test
ceph-exec rados bench -p replicapool 30 rand -t 16

# Clean up test data
ceph-exec rados -p replicapool cleanup
```

Key metrics to record:
- Bandwidth (MB/s)
- IOPS
- Average latency
- 95th percentile latency

## RBD Bench - Block Device Performance

```bash
# Create a test image
ceph-exec rbd create replicapool/bench-image --size 10240

# Write benchmark
ceph-exec rbd bench replicapool/bench-image \
  --io-type write \
  --io-size 4096 \
  --io-threads 16 \
  --io-total 1073741824  # 1 GB

# Read benchmark
ceph-exec rbd bench replicapool/bench-image \
  --io-type read \
  --io-size 4096 \
  --io-threads 16 \
  --io-total 1073741824

# Clean up
ceph-exec rbd rm replicapool/bench-image
```

## fio - Application-Realistic Workload Testing

For realistic application behavior, use fio from a pod that mounts a PVC:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fio-test
spec:
  containers:
  - name: fio
    image: ljishen/fio
    command:
    - fio
    - --name=randwrite
    - --ioengine=libaio
    - --direct=1
    - --rw=randwrite
    - --bs=4k
    - --numjobs=4
    - --iodepth=32
    - --size=1G
    - --runtime=60
    - --filename=/data/testfile
    - --output-format=json
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: fio-test-pvc
  restartPolicy: Never
```

## Recording and Comparing Results

Save results to a file with context:

```bash
cat > /tmp/perf-baseline-$(date +%Y%m%d).txt <<'EOF'
Date: 2026-03-31
Ceph version: 18.2.2
OSD count: 12
OSD type: NVMe
Network: 25 Gbps
EOF

ceph-exec rados bench -p replicapool 30 write --no-cleanup >> /tmp/perf-baseline-$(date +%Y%m%d).txt
```

Compare against previous baselines to detect regressions.

## Expected Performance Ranges

| Storage Type | Write IOPS (4K) | Read IOPS (4K) | Write BW (128K) |
|-------------|----------------|----------------|----------------|
| HDD (7200rpm) | 50-200 | 100-500 | 100-500 MB/s |
| SSD | 5,000-50,000 | 10,000-100,000 | 500-3000 MB/s |
| NVMe | 50,000-500,000 | 100,000-1M | 2-10 GB/s |

## Summary

Ceph performance validation uses rados bench for object storage, rbd bench for block storage, and fio for application-realistic workloads. Running and recording these tests before and after every significant cluster change creates an auditable performance history that makes regressions immediately visible.
