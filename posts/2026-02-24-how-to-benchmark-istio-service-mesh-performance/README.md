# How to Benchmark Istio Service Mesh Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Benchmarking, Performance, Service Mesh, Load Testing

Description: A comprehensive guide to benchmarking Istio service mesh performance including tools, methodologies, and interpreting results.

---

Benchmarking Istio properly is harder than it looks. People often run a quick load test, see some numbers, and draw conclusions without understanding what they are actually measuring. A good benchmark isolates the mesh overhead from the application overhead, tests realistic scenarios, and produces reproducible results. Here is how to do it right.

## Set Up a Baseline

Before measuring Istio overhead, you need a baseline - the same application running without the mesh. Deploy your test application in a namespace without sidecar injection:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bench-no-mesh
  labels:
    istio-injection: disabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bench-server
  namespace: bench-no-mesh
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bench-server
  template:
    metadata:
      labels:
        app: bench-server
    spec:
      containers:
      - name: server
        image: fortio/fortio:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "1"
            memory: 256Mi
          limits:
            cpu: "2"
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: bench-server
  namespace: bench-no-mesh
spec:
  ports:
  - name: http
    port: 8080
  selector:
    app: bench-server
```

Now deploy the same thing in a meshed namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bench-with-mesh
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bench-server
  namespace: bench-with-mesh
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bench-server
  template:
    metadata:
      labels:
        app: bench-server
    spec:
      containers:
      - name: server
        image: fortio/fortio:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "1"
            memory: 256Mi
          limits:
            cpu: "2"
            memory: 512Mi
```

## Use Fortio for Load Testing

Fortio is the load testing tool developed by the Istio team specifically for mesh benchmarking. It runs inside the cluster, which avoids measuring ingress overhead.

Deploy the Fortio client:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bench-client
  namespace: bench-with-mesh
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bench-client
  template:
    metadata:
      labels:
        app: bench-client
    spec:
      containers:
      - name: fortio
        image: fortio/fortio:latest
        resources:
          requests:
            cpu: "2"
            memory: 512Mi
          limits:
            cpu: "4"
            memory: 1Gi
```

Run the benchmark:

```bash
# Baseline - no mesh
kubectl exec -it deploy/bench-client -n bench-no-mesh -- fortio load \
  -c 16 \
  -qps 0 \
  -t 60s \
  -json /tmp/baseline.json \
  http://bench-server.bench-no-mesh:8080/echo

# With mesh
kubectl exec -it deploy/bench-client -n bench-with-mesh -- fortio load \
  -c 16 \
  -qps 0 \
  -t 60s \
  -json /tmp/meshed.json \
  http://bench-server.bench-with-mesh:8080/echo
```

The `-c 16` flag sets 16 concurrent connections, `-qps 0` means maximum throughput (no rate limiting), and `-t 60s` runs for 60 seconds.

## Key Metrics to Measure

Focus on these metrics when comparing results:

**Latency percentiles**: The p50, p90, p95, and p99 latency values tell you about consistent overhead. The difference between baseline and meshed at each percentile is the proxy overhead.

**Throughput**: Maximum requests per second achievable. The gap between baseline and meshed throughput shows the CPU cost of the proxy.

**CPU usage**: Monitor sidecar CPU consumption during the test.

```bash
# Run the benchmark and simultaneously watch CPU
kubectl top pods -n bench-with-mesh --containers

# Get Envoy specific stats during the test
kubectl exec -it deploy/bench-server -n bench-with-mesh -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "downstream_rq_total|upstream_rq_total"
```

## Test Different Payload Sizes

The proxy overhead varies with payload size. Test with multiple sizes:

```bash
# Small payload (1KB)
kubectl exec -it deploy/bench-client -n bench-with-mesh -- fortio load \
  -c 16 -qps 0 -t 60s \
  -payload-size 1024 \
  http://bench-server.bench-with-mesh:8080/echo

# Medium payload (10KB)
kubectl exec -it deploy/bench-client -n bench-with-mesh -- fortio load \
  -c 16 -qps 0 -t 60s \
  -payload-size 10240 \
  http://bench-server.bench-with-mesh:8080/echo

# Large payload (100KB)
kubectl exec -it deploy/bench-client -n bench-with-mesh -- fortio load \
  -c 16 -qps 0 -t 60s \
  -payload-size 102400 \
  http://bench-server.bench-with-mesh:8080/echo
```

## Test Different Concurrency Levels

The proxy behaves differently under varying concurrency:

```bash
# Low concurrency
for c in 1 2 4 8 16 32 64 128; do
  echo "=== Concurrency: $c ==="
  kubectl exec deploy/bench-client -n bench-with-mesh -- fortio load \
    -c $c -qps 0 -t 30s \
    http://bench-server.bench-with-mesh:8080/echo 2>&1 | grep -E "target|Sockets|qps|p50|p99"
done
```

## Benchmark mTLS Impact

To isolate the mTLS overhead, test with mTLS disabled and enabled:

```yaml
# Disable mTLS for the benchmark namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: disable-mtls
  namespace: bench-with-mesh
spec:
  mtls:
    mode: DISABLE
```

Run the same benchmark with mTLS disabled and compare. Re-enable mTLS after:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: bench-with-mesh
spec:
  mtls:
    mode: STRICT
```

## Use nighthawk for Advanced Benchmarking

For more detailed latency analysis, use nighthawk (Envoy's own load generator):

```bash
# Run nighthawk from inside the mesh
kubectl exec -it deploy/bench-client -n bench-with-mesh -- nighthawk_client \
  --concurrency 4 \
  --rps 1000 \
  --duration 60 \
  --output-format json \
  http://bench-server:8080/echo
```

Nighthawk provides more detailed latency histograms and can detect latency bimodal distributions that Fortio might miss.

## Benchmark Tips

**Warm up first**: Run a short load test before the real benchmark to warm up connection pools and JIT compilation:

```bash
kubectl exec deploy/bench-client -n bench-with-mesh -- fortio load -c 8 -qps 0 -t 10s http://bench-server:8080/echo
```

**Pin resources**: Use node affinity or taints to ensure the benchmark pods run on dedicated nodes, avoiding noisy-neighbor effects.

**Run multiple iterations**: Single runs can be noisy. Run the benchmark 3-5 times and report the median.

**Check for throttling**: Make sure neither the application container nor the sidecar is being CPU throttled during the test.

```bash
kubectl exec deploy/bench-server -n bench-with-mesh -c istio-proxy -- cat /sys/fs/cgroup/cpu/cpu.stat
```

**Record the environment**: Document the Istio version, Envoy version, Kubernetes version, node type, and any custom configuration. Benchmark results are meaningless without context.

## Interpreting Results

Typical Istio overhead numbers for reference:

- Latency: 1-3ms added per hop at p50, 3-10ms at p99
- Throughput: 10-20% reduction at maximum load
- CPU: Each sidecar uses 50-200 millicores under moderate load
- Memory: 30-100MB per sidecar depending on mesh size

If your numbers are significantly worse than these ranges, something is misconfigured. Common culprits include undersized sidecar resource limits, too many services in scope, or complex routing rules.

Good benchmarking takes time and attention to detail, but it pays off by giving you confidence in your mesh performance characteristics and a baseline to measure future optimizations against.
