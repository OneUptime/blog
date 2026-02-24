# How to Benchmark Istio Latency Overhead

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Benchmarking, Latency, Performance, Kubernetes

Description: How to accurately measure the latency overhead that Istio's sidecar proxy adds to your service-to-service communication.

---

Everyone asks the same question when evaluating Istio: how much latency does it add? The answer depends on your specific workload, message sizes, connection patterns, and Istio configuration. Generic benchmarks from blog posts can give you a ballpark, but the only number that matters is what you measure in your own environment.

This post shows you how to set up proper latency benchmarks for Istio so you get accurate, reproducible results.

## Why Latency Matters

Istio's sidecar proxy (Envoy) sits in the request path for every service-to-service call. Each request goes through two Envoy proxies: one on the client side and one on the server side. Each proxy does TLS handshake (for mTLS), header parsing, policy checks, telemetry collection, and routing decisions. All of this takes time.

For most services, the overhead is small (sub-millisecond to a few milliseconds). But if you have deep call chains where one request triggers 10 downstream calls, those milliseconds add up. And for latency-sensitive workloads like real-time bidding or gaming backends, even a small overhead matters.

## Setting Up the Benchmark Environment

Create a dedicated namespace for benchmarking:

```bash
kubectl create namespace bench
kubectl label namespace bench istio-injection=enabled
```

Deploy a simple echo server that returns immediately, so you're measuring only the proxy overhead and not application processing time:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
  namespace: bench
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo-server
  template:
    metadata:
      labels:
        app: echo-server
    spec:
      containers:
        - name: echo
          image: fortio/fortio:latest
          ports:
            - containerPort: 8080
          args:
            - server
---
apiVersion: v1
kind: Service
metadata:
  name: echo-server
  namespace: bench
spec:
  selector:
    app: echo-server
  ports:
    - port: 8080
      targetPort: 8080
```

Deploy the load generator:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: load-generator
  namespace: bench
spec:
  replicas: 1
  selector:
    matchLabels:
      app: load-generator
  template:
    metadata:
      labels:
        app: load-generator
    spec:
      containers:
        - name: fortio
          image: fortio/fortio:latest
          ports:
            - containerPort: 8080
          args:
            - server
```

Fortio is Istio's recommended benchmarking tool. It was actually created by the Istio team for exactly this purpose.

## Running the Baseline (Without Istio)

First, get a baseline measurement without Istio in the path. Create a non-injected namespace:

```bash
kubectl create namespace bench-no-istio
```

Deploy the same echo server and load generator without sidecar injection:

```bash
kubectl apply -f echo-server.yaml -n bench-no-istio
kubectl apply -f load-generator.yaml -n bench-no-istio
```

Run the baseline benchmark:

```bash
# From the load generator pod in the non-istio namespace
kubectl exec -n bench-no-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s -json /tmp/baseline.json \
  http://echo-server.bench-no-istio:8080/echo

# Copy results
kubectl cp bench-no-istio/$(kubectl get pod -n bench-no-istio -l app=load-generator \
  -o jsonpath='{.items[0].metadata.name}'):/tmp/baseline.json baseline.json -c fortio
```

The key parameters:
- `-c 16`: 16 concurrent connections
- `-qps 1000`: Target 1000 queries per second
- `-t 60s`: Run for 60 seconds

## Running the Istio Benchmark

Now run the same benchmark with Istio sidecars:

```bash
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s -json /tmp/with-istio.json \
  http://echo-server.bench:8080/echo

kubectl cp bench/$(kubectl get pod -n bench -l app=load-generator \
  -o jsonpath='{.items[0].metadata.name}'):/tmp/with-istio.json with-istio.json -c fortio
```

## Comparing Results

Use Fortio's built-in comparison:

```bash
# Access the Fortio UI
kubectl port-forward -n bench deploy/load-generator 8080:8080
```

Open `http://localhost:8080/fortio/` and upload both JSON results for visual comparison.

Or parse the JSON yourself:

```bash
# Extract key latency percentiles
for f in baseline.json with-istio.json; do
  echo "=== $f ==="
  jq '{
    p50: (.DurationHistogram.Percentiles[] | select(.Percentile == 50) | .Value * 1000),
    p90: (.DurationHistogram.Percentiles[] | select(.Percentile == 90) | .Value * 1000),
    p99: (.DurationHistogram.Percentiles[] | select(.Percentile == 99) | .Value * 1000),
    p999: (.DurationHistogram.Percentiles[] | select(.Percentile == 99.9) | .Value * 1000),
    avg: (.DurationHistogram.Avg * 1000),
    qps: .ActualQPS
  }' "$f"
done
```

This gives you latency in milliseconds for each percentile.

## Testing Different Scenarios

The overhead changes depending on the scenario. Test each one separately.

### Plaintext vs mTLS

Test with mTLS disabled to isolate the encryption overhead:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: disable-mtls
  namespace: bench
spec:
  mtls:
    mode: DISABLE
```

```bash
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s -json /tmp/no-mtls.json \
  http://echo-server.bench:8080/echo
```

### Different Message Sizes

Test with various payload sizes to see how message size affects overhead:

```bash
# 1 KB payload
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s -payload-size 1024 -json /tmp/1kb.json \
  http://echo-server.bench:8080/echo

# 10 KB payload
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s -payload-size 10240 -json /tmp/10kb.json \
  http://echo-server.bench:8080/echo

# 100 KB payload
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s -payload-size 102400 -json /tmp/100kb.json \
  http://echo-server.bench:8080/echo
```

### Different Concurrency Levels

Test how the overhead changes under different load levels:

```bash
for c in 1 4 16 64 256; do
  kubectl exec -n bench deploy/load-generator -c fortio -- \
    fortio load -c $c -qps 0 -t 60s -json /tmp/c${c}.json \
    http://echo-server.bench:8080/echo
done
```

Using `-qps 0` means "as fast as possible," which shows the maximum throughput at each concurrency level.

## Measuring Connection Setup Overhead

mTLS connection setup (TLS handshake) has a one-time cost per connection. For long-lived connections this is amortized, but for short-lived connections it's significant.

Test with connection reuse disabled:

```bash
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 100 -t 60s -nocatchup -keepalive=false \
  -json /tmp/no-keepalive.json \
  http://echo-server.bench:8080/echo
```

And with keepalive (the default):

```bash
kubectl exec -n bench deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 100 -t 60s -json /tmp/with-keepalive.json \
  http://echo-server.bench:8080/echo
```

The difference shows you the per-connection TLS handshake cost.

## Interpreting Results

Typical results you might see (these vary widely by hardware and configuration):

| Metric | Without Istio | With Istio | Overhead |
|--------|--------------|------------|----------|
| P50 latency | 0.3 ms | 0.8 ms | +0.5 ms |
| P99 latency | 1.2 ms | 3.5 ms | +2.3 ms |
| P99.9 latency | 5.0 ms | 12.0 ms | +7.0 ms |

The P99 and P99.9 overhead is always larger than the P50 overhead. This is because occasional proxy garbage collection pauses, TLS session renegotiation, and configuration pushes from istiod cause tail latency spikes.

## Reducing Latency Overhead

If the overhead is too high for your use case, there are several tuning options:

Increase sidecar CPU limits (more CPU reduces processing time):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 200m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

Disable features you don't need (like access logging or tracing) for latency-sensitive services:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: latency-sensitive
spec:
  accessLogging:
    - disabled: true
  tracing:
    - disableSpanReporting: true
```

Run your benchmarks after each change to measure the impact. Performance tuning without measurement is just guessing.
