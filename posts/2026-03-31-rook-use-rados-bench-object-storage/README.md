# How to Use rados bench for Object Storage Benchmarking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Benchmarking, RADOS, Object Storage, Performance

Description: Use the rados bench tool to measure Ceph object storage throughput, IOPS, and latency for write and read workloads with configurable concurrency and object sizes.

---

## What is rados bench?

`rados bench` is Ceph's built-in benchmarking tool that writes objects directly to a RADOS pool and measures throughput, IOPS, and latency. Unlike fio, it bypasses the block and file layers entirely, testing the raw object store performance that all Ceph services (RGW, RBD, CephFS) build on.

## Basic Usage

`rados bench` has three modes: `write`, `seq` (sequential read), and `rand` (random read). Sequential read replays the objects written in the write phase; random read reads them in random order.

```bash
# Basic write benchmark (30 seconds, default 4 MB objects)
rados bench -p my-pool 30 write

# Sequential read (must have objects from write phase)
rados bench -p my-pool 30 seq

# Random read
rados bench -p my-pool 30 rand

# Clean up test objects
rados -p my-pool cleanup
```

## Key Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-b <size>` | Block size (write size per operation) | 4 MB |
| `-t <threads>` | Concurrent write threads | 16 |
| `--no-cleanup` | Keep objects after write test | false |
| `-O <size>` | Object size (overrides `-b` for object size) | Same as `-b` |
| `--show-time` | Show timestamp per second | false |
| `--run-name <name>` | Unique run ID | benchmark_last_metadata |

## Comprehensive Benchmark Script

Test multiple object sizes and concurrency levels:

```bash
#!/bin/bash
POOL="benchmark-pool"
DURATION=60

# Create dedicated pool
ceph osd pool create $POOL 64 64
ceph osd pool application enable $POOL rados

echo "=== rados bench results ==="
echo "Pool: $POOL, Duration: ${DURATION}s"
echo ""

for OBJ_SIZE in 4k 64k 1M 4M 16M; do
  for THREADS in 4 8 16 32; do
    echo "--- Object: $OBJ_SIZE, Threads: $THREADS ---"
    rados bench -p $POOL $DURATION write \
        --no-cleanup \
        -b $OBJ_SIZE \
        -t $THREADS \
        --run-name "run_${OBJ_SIZE}_${THREADS}" 2>&1 \
        | grep -E "Bandwidth|IOPS|Latency"
    # Clean up between runs
    rados -p $POOL cleanup \
        --run-name "run_${OBJ_SIZE}_${THREADS}" > /dev/null 2>&1
  done
done
```

## Interpreting Results

Sample output from a write benchmark:

```text
Maintaining 16 concurrent writes of 4194304 bytes for up to 60 seconds
Total time run:         60.0072
Total writes made:      7124
Write size:             4194304
Object size:            4194304
Bandwidth (MB/sec):     474.897
Stddev Bandwidth:       21.432
Max bandwidth (MB/sec): 502.000
Min bandwidth (MB/sec): 428.000
Average IOPS:           118
Stddev IOPS:            5
Max IOPS:               125
Min IOPS:               107
Average Latency(s):     0.135279
Stddev Latency:         0.032152
Max latency(s):         1.20243
Min latency(s):         0.04327
```

Key metrics:
- **Bandwidth**: Average sustained throughput in MB/s
- **IOPS**: Operations per second (most relevant for small objects)
- **Average Latency**: Mean operation completion time
- **Max Latency**: Worst-case operation (important for SLA planning)
- **Stddev**: Consistency indicator - high stddev means variable performance

## Testing from Kubernetes

Run rados bench in a Rook-managed cluster using a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: rados-bench
  namespace: rook-ceph
spec:
  containers:
  - name: rados-bench
    image: quay.io/ceph/ceph:v18.2.0
    command:
    - /bin/bash
    - -c
    - |
      rados bench -p benchmark-pool 60 write \
          --no-cleanup -b 4M -t 16 && \
      rados bench -p benchmark-pool 60 seq -t 16 && \
      rados bench -p benchmark-pool 60 rand -t 16 && \
      rados -p benchmark-pool cleanup
    env:
    - name: CEPH_CONF
      value: /etc/ceph/ceph.conf
    volumeMounts:
    - name: ceph-conf
      mountPath: /etc/ceph
  volumes:
  - name: ceph-conf
    configMap:
      name: rook-ceph-config
  restartPolicy: Never
```

## Comparing Read vs Write Performance

```bash
# Write test (captures objects for subsequent reads)
rados bench -p benchmark-pool 60 write --no-cleanup -b 4M -t 16 \
    | tee /tmp/write-results.txt

# Sequential read (same objects, same order)
rados bench -p benchmark-pool 60 seq -t 16 \
    | tee /tmp/seq-read-results.txt

# Random read (same objects, random order)
rados bench -p benchmark-pool 60 rand -t 16 \
    | tee /tmp/rand-read-results.txt

# Extract bandwidth for comparison
echo "Write BW: $(grep "^Bandwidth" /tmp/write-results.txt | awk '{print $3}') MB/s"
echo "Seq Read BW: $(grep "^Bandwidth" /tmp/seq-read-results.txt | awk '{print $3}') MB/s"
echo "Rand Read BW: $(grep "^Bandwidth" /tmp/rand-read-results.txt | awk '{print $3}') MB/s"
```

## Summary

`rados bench` provides direct object store performance measurements that reflect the raw capability of your Ceph hardware and configuration. Testing with multiple object sizes reveals the performance curve from small I/O-bound operations to large bandwidth-bound transfers. The combination of write, sequential read, and random read benchmarks captures the full spectrum of object storage workload characteristics needed for capacity planning and performance validation.
