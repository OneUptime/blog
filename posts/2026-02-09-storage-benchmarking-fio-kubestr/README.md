# How to Implement Storage Benchmarking with fio and kubestr on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Benchmarking

Description: Benchmark Kubernetes storage performance using fio and kubestr tools with IOPS measurement, throughput testing, latency analysis, and comparison across storage classes.

---

Understanding storage performance is critical for application planning and capacity management. Benchmarking tools like fio (Flexible I/O Tester) and kubestr provide standardized methods to measure IOPS, throughput, and latency across different storage classes. Regular benchmarking helps identify performance bottlenecks, validate storage configurations, and ensure your storage meets application requirements.

## Understanding Storage Metrics

Storage performance involves three key metrics. IOPS (Input/Output Operations Per Second) measures how many read/write operations the storage handles per second, critical for database workloads with many small transactions. Throughput measures data transfer rate in MB/s, important for video processing and backup operations. Latency measures response time in milliseconds, affecting application responsiveness.

Different workload patterns require different optimization strategies. Random read/write operations (like databases) benefit from high IOPS, while sequential operations (like log processing) need high throughput. Understanding your workload characteristics guides storage selection and configuration.

## Installing fio

Deploy fio for direct storage benchmarking.

```yaml
# fio-benchmark.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fio-test-pvc
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: your-storage-class
---
apiVersion: v1
kind: Pod
metadata:
  name: fio-tester
  namespace: default
spec:
  containers:
  - name: fio
    image: ljishen/fio:latest
    command:
    - sleep
    - infinity
    volumeMounts:
    - name: data
      mountPath: /data
    resources:
      requests:
        memory: "1Gi"
        cpu: "1000m"
      limits:
        memory: "2Gi"
        cpu: "2000m"
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: fio-test-pvc
```

Deploy and access:

```bash
kubectl apply -f fio-benchmark.yaml
kubectl wait --for=condition=ready pod/fio-tester
kubectl exec -it fio-tester -- bash
```

## Random Read IOPS Test

Measure random read performance critical for database queries.

```bash
# Random read IOPS test
kubectl exec -it fio-tester -- fio \
  --name=random-read \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randread \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile

# Example output shows IOPS
# read: IOPS=12.5k, BW=48.9MiB/s
```

Parameters explained:
- `--ioengine=libaio`: Linux asynchronous I/O
- `--iodepth=32`: Queue depth for concurrent operations
- `--rw=randread`: Random read pattern
- `--bs=4k`: 4KB block size (typical database page)
- `--direct=1`: Bypass OS cache for accurate results
- `--numjobs=4`: Simulate 4 concurrent threads

## Random Write IOPS Test

Test random write performance for database inserts and updates.

```bash
kubectl exec -it fio-tester -- fio \
  --name=random-write \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randwrite \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile
```

## Sequential Read/Write Throughput

Measure sequential performance for streaming workloads.

```bash
# Sequential read throughput
kubectl exec -it fio-tester -- fio \
  --name=seq-read \
  --ioengine=libaio \
  --iodepth=16 \
  --rw=read \
  --bs=1M \
  --direct=1 \
  --size=2G \
  --numjobs=1 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile

# Sequential write throughput
kubectl exec -it fio-tester -- fio \
  --name=seq-write \
  --ioengine=libaio \
  --iodepth=16 \
  --rw=write \
  --bs=1M \
  --direct=1 \
  --size=2G \
  --numjobs=1 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile
```

## Mixed Read/Write Workload

Simulate realistic mixed workloads.

```bash
# 70% read, 30% write
kubectl exec -it fio-tester -- fio \
  --name=mixed-workload \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randrw \
  --rwmixread=70 \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile
```

## Installing kubestr

kubestr simplifies storage benchmarking with Kubernetes-aware testing.

```bash
# Download kubestr
curl -LO https://github.com/kastenhq/kubestr/releases/download/v0.4.41/kubestr-v0.4.41-linux-amd64.tar.gz
tar -xvzf kubestr-v0.4.41-linux-amd64.tar.gz
chmod +x kubestr

# Move to PATH
sudo mv kubestr /usr/local/bin/

# Verify installation
kubestr version
```

## Benchmarking with kubestr

Run comprehensive storage benchmark.

```bash
# Benchmark specific storage class
kubestr fio -s your-storage-class -z 10Gi

# Compare multiple storage classes
kubestr fio -s fast-ssd -z 10Gi > fast-ssd-results.txt
kubestr fio -s standard -z 10Gi > standard-results.txt

# Quick benchmark (shorter duration)
kubestr fio -s your-storage-class -z 5Gi --quick
```

kubestr automatically creates PVC, runs multiple fio tests, and cleans up resources.

## Snapshot Performance Testing

Test snapshot creation and restoration speed.

```bash
# Test snapshot capabilities
kubestr snapshot -s your-storage-class

# Measure snapshot creation time
kubectl create -f test-snapshot.yaml
time kubectl wait --for=condition=ready volumesnapshot/test-snap

# Measure restore time
time kubectl apply -f restore-from-snapshot.yaml
```

## Creating Comprehensive Benchmark Suite

Automate benchmarking across storage classes.

```yaml
# benchmark-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: storage-benchmark
spec:
  template:
    spec:
      containers:
      - name: benchmark
        image: ljishen/fio:latest
        command:
        - sh
        - -c
        - |
          echo "=== Random Read IOPS ===" > /results/benchmark.txt
          fio --name=rand-read --rw=randread --bs=4k --size=1G --numjobs=4 --runtime=60 --group_reporting --filename=/data/test | grep "IOPS=" >> /results/benchmark.txt

          echo "\n=== Random Write IOPS ===" >> /results/benchmark.txt
          fio --name=rand-write --rw=randwrite --bs=4k --size=1G --numjobs=4 --runtime=60 --group_reporting --filename=/data/test | grep "IOPS=" >> /results/benchmark.txt

          echo "\n=== Sequential Read Throughput ===" >> /results/benchmark.txt
          fio --name=seq-read --rw=read --bs=1M --size=2G --runtime=60 --group_reporting --filename=/data/test | grep "BW=" >> /results/benchmark.txt

          cat /results/benchmark.txt
        volumeMounts:
        - name: test-data
          mountPath: /data
        - name: results
          mountPath: /results
      restartPolicy: Never
      volumes:
      - name: test-data
        persistentVolumeClaim:
          claimName: benchmark-pvc
      - name: results
        emptyDir: {}
```

## Analyzing Results

Compare results across storage classes.

```bash
# Extract IOPS values
grep "IOPS=" fast-ssd-results.txt
grep "IOPS=" standard-results.txt

# Compare latency
grep "lat (usec)" fast-ssd-results.txt
grep "lat (usec)" standard-results.txt

# Compare throughput
grep "BW=" fast-ssd-results.txt
grep "BW=" standard-results.txt
```

Create comparison table:

| Storage Class | Random Read IOPS | Random Write IOPS | Seq Read MB/s | Seq Write MB/s | Avg Latency |
|---------------|------------------|-------------------|---------------|----------------|-------------|
| fast-ssd      | 15000            | 12000             | 500           | 400            | 2ms         |
| standard      | 3000             | 2500              | 150           | 120            | 8ms         |

## Latency Testing

Measure detailed latency distribution.

```bash
kubectl exec -it fio-tester -- fio \
  --name=latency-test \
  --ioengine=libaio \
  --iodepth=1 \
  --rw=randread \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --runtime=60 \
  --percentile_list=50:90:95:99:99.9:99.99 \
  --filename=/data/testfile
```

This shows latency percentiles critical for understanding tail latency.

## Automated Benchmark CI/CD

Integrate benchmarking into CI/CD pipeline.

```yaml
# .github/workflows/storage-benchmark.yaml
name: Storage Performance Benchmark
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Install kubestr
      run: |
        curl -LO https://github.com/kastenhq/kubestr/releases/download/v0.4.41/kubestr
        chmod +x kubestr

    - name: Run benchmarks
      run: |
        ./kubestr fio -s fast-ssd -z 10Gi > results-$(date +%Y%m%d).txt

    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: benchmark-results
        path: results-*.txt
```

## Best Practices

Follow these guidelines for accurate benchmarking:

1. Run tests multiple times and average results
2. Use appropriate test duration (60+ seconds)
3. Test on actual storage classes used in production
4. Consider workload-specific patterns
5. Benchmark during maintenance windows to avoid impacting production
6. Document test conditions (cluster load, time of day)
7. Compare against baseline measurements
8. Monitor cluster resources during tests

## Troubleshooting

Common issues and solutions:

```bash
# Insufficient permissions
kubectl auth can-i create pvc

# Storage class not found
kubectl get storageclass

# Out of capacity
kubectl describe pvc benchmark-pvc

# fio command not found
kubectl exec pod -- which fio

# Check pod resources during test
kubectl top pod fio-tester
```

## Conclusion

Regular storage benchmarking with fio and kubestr provides objective performance data for capacity planning and troubleshooting. Understanding IOPS, throughput, and latency characteristics across your storage classes enables informed decisions about storage selection for different workload types. Automate benchmarking to track performance trends over time and detect degradation before it impacts applications. Combine benchmark results with application requirements to ensure your storage infrastructure meets performance expectations.
