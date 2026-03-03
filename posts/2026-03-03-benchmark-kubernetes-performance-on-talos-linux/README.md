# How to Benchmark Kubernetes Performance on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Benchmarking, Kubernetes, Performance Testing, Monitoring

Description: A comprehensive guide to benchmarking Kubernetes cluster performance on Talos Linux covering network, storage, API server, and pod scheduling

---

Benchmarking your Kubernetes cluster on Talos Linux gives you a baseline to measure improvements, identify bottlenecks, and validate that your tuning changes are actually helping. Without proper benchmarks, performance tuning is just guessing. This guide covers the essential benchmarks you should run, the tools to use, and how to interpret the results on Talos Linux.

## Why Benchmark on Talos Linux Specifically

Talos Linux has a different performance profile than traditional distributions. Its immutable, minimal design means less background noise, fewer system services competing for resources, and a more predictable baseline. This makes benchmarking both easier (less noise) and more important (you can detect smaller improvements that would be hidden in noise on other systems).

Before running any benchmarks, make sure your cluster is in a stable state. No upgrades running, no pods in crash loops, no other load generators active. Benchmarks need a controlled environment to produce meaningful results.

## Network Performance Benchmarking

Network performance is often the most important metric for microservices-based applications. Use iperf3 to measure raw network throughput and latency between nodes and between pods.

### Node-to-Node Bandwidth

```yaml
# iperf3-server.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf3-server
  labels:
    app: iperf3-server
spec:
  hostNetwork: true              # Use host networking to measure raw performance
  nodeSelector:
    kubernetes.io/hostname: node-1
  containers:
  - name: iperf3
    image: networkstatic/iperf3:latest
    command: ["iperf3", "-s"]
    ports:
    - containerPort: 5201
```

```bash
# Run the client on a different node
kubectl run iperf3-client \
  --image=networkstatic/iperf3:latest \
  --restart=Never \
  --overrides='{"spec":{"hostNetwork":true,"nodeSelector":{"kubernetes.io/hostname":"node-2"}}}' \
  -- iperf3 -c node-1-ip -t 30 -P 4 --json

# Get results
kubectl logs iperf3-client
```

### Pod-to-Pod Bandwidth (Through CNI)

```yaml
# iperf3-pod-server.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf3-pod-server
  labels:
    app: iperf3-pod
spec:
  nodeSelector:
    kubernetes.io/hostname: node-1
  containers:
  - name: iperf3
    image: networkstatic/iperf3:latest
    command: ["iperf3", "-s"]

---
apiVersion: v1
kind: Service
metadata:
  name: iperf3-server-svc
spec:
  selector:
    app: iperf3-pod
  ports:
  - port: 5201
```

```bash
# Run client through pod networking (measures CNI overhead)
kubectl run iperf3-pod-client \
  --image=networkstatic/iperf3:latest \
  --restart=Never \
  -- iperf3 -c iperf3-server-svc -t 30 -P 4
```

Compare host networking vs pod networking results. The difference tells you how much overhead your CNI adds. On Cilium with eBPF, the overhead should be under 5%. With iptables-based CNIs, it can be 15-20%.

### Network Latency

```bash
# Measure round-trip latency with netperf
kubectl run netperf-server \
  --image=networkstatic/netperf:latest \
  --command -- netserver

kubectl run netperf-client \
  --image=networkstatic/netperf:latest \
  --restart=Never \
  -- netperf -H netperf-server -t TCP_RR -l 60 -- -O min_latency,mean_latency,max_latency,p99_latency
```

## Storage Performance Benchmarking

Storage benchmarks should cover both throughput and IOPS for your persistent volumes and ephemeral storage.

### Using fio for Disk Benchmarks

```yaml
# fio-benchmark.yaml
apiVersion: v1
kind: Pod
metadata:
  name: fio-bench
spec:
  containers:
  - name: fio
    image: ljishen/fio:latest
    command:
    - /bin/sh
    - -c
    - |
      # Sequential write throughput
      fio --name=seq-write \
          --filename=/data/testfile \
          --rw=write \
          --bs=1M \
          --size=4G \
          --numjobs=1 \
          --runtime=60 \
          --time_based \
          --output-format=json

      # Random read IOPS
      fio --name=rand-read \
          --filename=/data/testfile \
          --rw=randread \
          --bs=4k \
          --size=4G \
          --numjobs=4 \
          --iodepth=32 \
          --runtime=60 \
          --time_based \
          --output-format=json

      # Random write IOPS
      fio --name=rand-write \
          --filename=/data/testfile \
          --rw=randwrite \
          --bs=4k \
          --size=4G \
          --numjobs=4 \
          --iodepth=32 \
          --runtime=60 \
          --time_based \
          --output-format=json

      # Mixed read/write (70/30)
      fio --name=mixed-rw \
          --filename=/data/testfile \
          --rw=randrw \
          --rwmixread=70 \
          --bs=4k \
          --size=4G \
          --numjobs=4 \
          --iodepth=32 \
          --runtime=60 \
          --time_based \
          --output-format=json
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: benchmark-pvc
```

### etcd Benchmark

etcd performance directly impacts API server responsiveness. Use etcd's built-in benchmark tool:

```bash
# Check etcd latency from the node
talosctl etcd status --nodes 10.0.0.1

# Use the etcd benchmark tool in a pod
kubectl run etcd-bench --image=bitnami/etcd:latest --rm -it -- \
  etcdctl --endpoints=https://etcd-endpoint:2379 \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  check perf --load="m"
```

## API Server Benchmarking

The Kubernetes API server is the gateway to the cluster. Benchmark its response time under load:

```bash
# Simple API server latency test
kubectl run api-bench --image=bitnami/kubectl:latest --rm -it -- \
  /bin/sh -c '
  for i in $(seq 1 100); do
    START=$(date +%s%N)
    kubectl get nodes > /dev/null 2>&1
    END=$(date +%s%N)
    echo "$((($END-$START)/1000000))ms"
  done
  '
```

For more thorough testing, use `k6` or a similar load testing tool:

```yaml
# k6-api-bench.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: api-bench
spec:
  template:
    spec:
      serviceAccountName: benchmark-sa
      containers:
      - name: k6
        image: grafana/k6:latest
        command:
        - k6
        - run
        - /scripts/api-bench.js
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: k6-scripts
      restartPolicy: Never
```

## Pod Scheduling Benchmark

How fast can your cluster schedule and start pods? This matters for autoscaling and failover scenarios:

```bash
# Measure pod scheduling time
for i in $(seq 1 20); do
  START=$(date +%s%N)
  kubectl run "bench-pod-$i" --image=busybox --restart=Never -- sleep 3600
  # Wait until the pod is running
  kubectl wait --for=condition=Ready "pod/bench-pod-$i" --timeout=60s
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  echo "Pod $i scheduled in ${DURATION}ms"
done

# Clean up
kubectl delete pod -l run=bench-pod --force
```

## DNS Resolution Benchmark

DNS resolution performance affects every service-to-service call in your cluster:

```yaml
# dns-benchmark.yaml
apiVersion: v1
kind: Pod
metadata:
  name: dns-bench
spec:
  containers:
  - name: dns-test
    image: alpine:latest
    command:
    - /bin/sh
    - -c
    - |
      apk add --no-cache bind-tools

      echo "=== DNS Resolution Benchmark ==="
      for i in $(seq 1 100); do
        START=$(date +%s%N)
        dig kubernetes.default.svc.cluster.local +short > /dev/null
        END=$(date +%s%N)
        echo "$((($END-$START)/1000000))"
      done | awk '{
        sum += $1; count++;
        if ($1 < min || min == 0) min = $1;
        if ($1 > max) max = $1;
      } END {
        print "Avg: " sum/count "ms"
        print "Min: " min "ms"
        print "Max: " max "ms"
      }'
```

## Interpreting Results

When analyzing benchmark results on Talos Linux, keep these reference points in mind:

```
# Typical good performance numbers on modern hardware:
# Node-to-node bandwidth (10GbE):        9+ Gbps
# Pod-to-pod bandwidth (eBPF CNI):       8+ Gbps
# Pod-to-pod latency (same node):        < 100us
# Pod-to-pod latency (cross node):       < 500us
# NVMe sequential write:                 2+ GB/s
# NVMe random read IOPS (4K):            500K+ IOPS
# etcd write latency (fsync):            < 5ms
# API server GET latency:                < 50ms
# Pod scheduling time:                   < 5s
# DNS resolution:                        < 5ms
```

Numbers significantly worse than these indicate a bottleneck worth investigating.

## Automating Benchmarks

Create a CronJob to run benchmarks regularly and track performance over time:

```yaml
# benchmark-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-benchmark
spec:
  schedule: "0 2 * * 0"           # Run every Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: benchmark
            image: my-benchmark-suite:latest
            # Run all benchmarks and push results to Prometheus
          restartPolicy: OnFailure
```

## Conclusion

Benchmarking your Kubernetes cluster on Talos Linux provides the data you need to make informed tuning decisions. Run a complete set of benchmarks before making any changes to establish a baseline. Then run the same benchmarks after each change to quantify the impact. Focus on network, storage, API server, and scheduling performance as these are the four pillars that determine overall cluster responsiveness. Store your benchmark results over time to catch regressions early and track the cumulative effect of your optimizations.
