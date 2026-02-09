# How to Benchmark Persistent Volume Performance with fio on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Performance

Description: Learn how to use fio to benchmark Kubernetes persistent volume performance and understand IOPS, throughput, and latency characteristics of your storage.

---

Storage performance directly impacts application responsiveness and throughput. Different storage classes and volume types deliver vastly different performance characteristics. Using fio (Flexible I/O Tester) in Kubernetes helps you measure actual storage performance and make informed decisions about storage class selection.

## Understanding Storage Performance Metrics

Storage performance involves several key metrics:

**IOPS (Input/Output Operations Per Second)**: How many read or write operations the storage completes per second. Important for database workloads and applications with many small files.

**Throughput (MB/s)**: The rate of data transfer. Critical for applications that process large files like video encoding, data analytics, or backups.

**Latency (milliseconds)**: Time between initiating an I/O operation and its completion. Low latency matters for interactive applications and real-time systems.

Different workloads prioritize different metrics. A database needs high IOPS and low latency. A media processing pipeline needs high throughput. Your storage choice should match your application's performance profile.

## Installing fio in Kubernetes

Create a job that runs fio tests on a persistent volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fio-test-volume
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
---
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-benchmark
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - /bin/sh
        - -c
        - |
          # Create test directory
          mkdir -p /data/fio-test

          # Run benchmarks (will be replaced with specific tests)
          echo "Starting fio benchmarks..."

        volumeMounts:
        - name: test-volume
          mountPath: /data
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

## Random Read IOPS Test

Measure random read IOPS with 4KB block size:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-random-read-iops
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=random-read-test
        - --ioengine=libaio
        - --direct=1
        - --bs=4k
        - --rw=randread
        - --size=10G
        - --numjobs=4
        - --runtime=60
        - --time_based
        - --group_reporting
        - --directory=/data/fio-test
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

Key parameters explained:
- `--ioengine=libaio`: Use Linux native asynchronous I/O for best performance
- `--direct=1`: Bypass page cache for accurate storage performance
- `--bs=4k`: 4KB block size (typical for random I/O)
- `--rw=randread`: Random read pattern
- `--numjobs=4`: Run 4 parallel jobs to saturate storage
- `--runtime=60`: Run for 60 seconds
- `--time_based`: Continue for full runtime even if file is read multiple times

Run and view results:

```bash
kubectl apply -f fio-random-read.yaml

# Wait for job completion
kubectl wait --for=condition=complete job/fio-random-read-iops --timeout=300s

# View results
kubectl logs job/fio-random-read-iops
```

## Random Write IOPS Test

Test random write performance:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-random-write-iops
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=random-write-test
        - --ioengine=libaio
        - --direct=1
        - --bs=4k
        - --rw=randwrite
        - --size=10G
        - --numjobs=4
        - --runtime=60
        - --time_based
        - --group_reporting
        - --directory=/data/fio-test
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

## Sequential Read Throughput Test

Measure sequential read throughput with larger blocks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-sequential-read
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=sequential-read-test
        - --ioengine=libaio
        - --direct=1
        - --bs=1M
        - --rw=read
        - --size=10G
        - --numjobs=1
        - --runtime=60
        - --time_based
        - --group_reporting
        - --directory=/data/fio-test
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

Using 1MB block size shows throughput capabilities for streaming workloads.

## Sequential Write Throughput Test

Test sequential write performance:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-sequential-write
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=sequential-write-test
        - --ioengine=libaio
        - --direct=1
        - --bs=1M
        - --rw=write
        - --size=10G
        - --numjobs=1
        - --runtime=60
        - --time_based
        - --group_reporting
        - --directory=/data/fio-test
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

## Mixed Read/Write Workload Test

Simulate a realistic mixed workload:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-mixed-workload
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=mixed-workload-test
        - --ioengine=libaio
        - --direct=1
        - --bs=4k
        - --rw=randrw
        - --rwmixread=70
        - --size=10G
        - --numjobs=4
        - --runtime=60
        - --time_based
        - --group_reporting
        - --directory=/data/fio-test
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

The `--rwmixread=70` parameter creates a 70% read, 30% write mix, simulating typical database workloads.

## Latency Test

Measure I/O latency with single-threaded operations:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-latency-test
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=latency-test
        - --ioengine=libaio
        - --direct=1
        - --bs=4k
        - --rw=randread
        - --iodepth=1
        - --size=1G
        - --numjobs=1
        - --runtime=60
        - --time_based
        - --group_reporting
        - --lat_percentiles=1
        - --directory=/data/fio-test
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      restartPolicy: Never
  backoffLimit: 1
```

Using `--iodepth=1` ensures one I/O operation at a time, revealing true latency without queue depth benefits.

## Comprehensive Benchmark Suite

Create a complete test suite using a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fio-test-suite
data:
  test-suite.fio: |
    [global]
    ioengine=libaio
    direct=1
    directory=/data/fio-test
    runtime=60
    time_based=1
    group_reporting=1

    [random-read-4k]
    bs=4k
    rw=randread
    numjobs=4
    size=10G

    [random-write-4k]
    bs=4k
    rw=randwrite
    numjobs=4
    size=10G

    [sequential-read-1m]
    bs=1M
    rw=read
    numjobs=1
    size=10G

    [sequential-write-1m]
    bs=1M
    rw=write
    numjobs=1
    size=10G

    [mixed-workload]
    bs=4k
    rw=randrw
    rwmixread=70
    numjobs=4
    size=10G
---
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-comprehensive-test
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - /config/test-suite.fio
        - --output-format=json
        - --output=/data/results.json
        volumeMounts:
        - name: test-volume
          mountPath: /data
        - name: config
          mountPath: /config
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-volume
      - name: config
        configMap:
          name: fio-test-suite
      restartPolicy: Never
  backoffLimit: 1
```

## Parsing and Analyzing Results

Extract key metrics from fio output:

```bash
#!/bin/bash
# parse-fio-results.sh

POD=$(kubectl get pods -l job-name=fio-comprehensive-test -o name | head -1)

kubectl logs $POD | jq -r '
  .jobs[] |
  {
    test: .jobname,
    read_iops: .read.iops,
    read_bw_mbs: (.read.bw / 1024),
    read_lat_avg_us: .read.lat_ns.mean / 1000,
    read_lat_p99_us: .read.lat_ns.percentile."99.000000" / 1000,
    write_iops: .write.iops,
    write_bw_mbs: (.write.bw / 1024),
    write_lat_avg_us: .write.lat_ns.mean / 1000,
    write_lat_p99_us: .write.lat_ns.percentile."99.000000" / 1000
  } |
  to_entries |
  map("\(.key): \(.value)") |
  join("\n")
'
```

## Comparing Storage Classes

Test multiple storage classes systematically:

```bash
#!/bin/bash
# compare-storage-classes.sh

STORAGE_CLASSES=("standard" "fast-ssd" "extreme-iops")

for sc in "${STORAGE_CLASSES[@]}"; do
  echo "Testing storage class: $sc"

  # Create PVC
  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: fio-test-$sc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: $sc
EOF

  # Wait for PVC to be bound
  kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/fio-test-$sc --timeout=120s

  # Run test
  cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: fio-test-$sc
spec:
  template:
    spec:
      containers:
      - name: fio
        image: ljishen/fio:latest
        command:
        - fio
        - --name=test
        - --ioengine=libaio
        - --direct=1
        - --bs=4k
        - --rw=randread
        - --numjobs=4
        - --runtime=60
        - --time_based
        - --group_reporting
        - --directory=/data
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: fio-test-$sc
      restartPolicy: Never
  backoffLimit: 1
EOF

  # Wait for completion
  kubectl wait --for=condition=complete job/fio-test-$sc --timeout=300s

  # Save results
  kubectl logs job/fio-test-$sc > results-$sc.txt

  # Cleanup
  kubectl delete job fio-test-$sc
  kubectl delete pvc fio-test-$sc
done

echo "Results saved to results-*.txt files"
```

## Monitoring During Tests

Watch storage metrics during fio tests:

```bash
# Monitor pod resource usage
kubectl top pod -l job-name=fio-comprehensive-test

# Watch volume metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq -r '
  .items[] |
  select(.metadata.name | startswith("fio-")) |
  {
    pod: .metadata.name,
    volumes: [.containers[].volumeUsage[]? | {name: .name, used: .usedBytes, capacity: .capacityBytes}]
  }
'
```

Use Prometheus to track I/O metrics:

```promql
# Volume I/O operations
rate(kubelet_volume_stats_inodes_used[5m])

# Volume throughput
rate(kubelet_volume_stats_used_bytes[5m])
```

## Best Practices for Benchmarking

Always run tests multiple times and average results. Storage performance varies based on cache state, network conditions, and cluster load.

Test with realistic data sizes. A 1GB test on a 1TB volume might not reveal performance characteristics of larger datasets.

Run tests during different times of day. Multi-tenant storage shows performance variation based on noisy neighbor effects.

Document test conditions including node type, cluster load, and time of test. These factors affect results reproducibility.

Compare your results against vendor specifications. If measured performance is significantly lower than advertised, investigate configuration issues.

## Interpreting Results

Good random read IOPS for SSD storage: 10,000+ IOPS. Good random write IOPS for SSD storage: 5,000+ IOPS. Good sequential read throughput: 500+ MB/s. Good sequential write throughput: 250+ MB/s. Good latency (p99): Less than 10ms for random I/O.

These numbers vary significantly based on storage technology. NVMe drives deliver much higher performance than traditional SSDs or spinning disks.

## Conclusion

Benchmarking persistent volumes with fio provides objective data about your storage performance. Use these measurements to select appropriate storage classes for different workloads, identify performance bottlenecks, and validate that your storage meets application requirements. Regular benchmarking ensures storage performance remains consistent as your cluster evolves.
