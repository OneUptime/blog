# How to Benchmark Istio Throughput Impact

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Benchmarking, Throughput, Performance, Kubernetes

Description: How to measure the impact of Istio sidecar proxies on request throughput and data transfer rates in your Kubernetes cluster.

---

Throughput is about how many requests per second your services can handle, and how much data can flow between them. When you add Istio sidecars, every request passes through two extra hops (client proxy and server proxy), and every byte gets encrypted and decrypted. This has a cost, and you should know exactly what that cost is for your workloads.

This post covers how to benchmark Istio's throughput impact accurately, what factors affect it, and how to optimize when you need more throughput.

## What Affects Throughput

Several factors determine how much Istio affects your throughput:

- **Sidecar CPU allocation**: More CPU for the proxy means higher throughput
- **Message size**: Larger messages spend more time in encryption/decryption
- **Connection count**: More concurrent connections can improve throughput up to a point
- **HTTP version**: HTTP/2 multiplexing improves throughput versus HTTP/1.1
- **mTLS**: The encryption overhead reduces throughput compared to plaintext
- **Telemetry**: Access logging and tracing add per-request overhead

## Setting Up the Benchmark

Use Fortio for consistent, reproducible benchmarks. Deploy it in both an Istio-injected and non-injected namespace:

```bash
kubectl create namespace bench-istio
kubectl label namespace bench-istio istio-injection=enabled

kubectl create namespace bench-plain
```

Deploy the server in both namespaces:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
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
          args: ["server"]
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "2"
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: echo-server
spec:
  selector:
    app: echo-server
  ports:
    - port: 8080
```

```bash
kubectl apply -f server.yaml -n bench-istio
kubectl apply -f server.yaml -n bench-plain
```

Note the explicit resource limits on the server. This prevents the application container from being CPU-starved by the sidecar, which would skew your results.

## Maximum Throughput Test (Requests Per Second)

Run the load generator at maximum speed (no rate limiting) with increasing concurrency:

```bash
# Baseline without Istio
for c in 2 4 8 16 32 64 128 256; do
  echo "=== Concurrency: $c ==="
  kubectl exec -n bench-plain deploy/load-generator -c fortio -- \
    fortio load -c $c -qps 0 -t 30s -json /tmp/plain-c${c}.json \
    http://echo-server.bench-plain:8080/echo 2>&1 | grep "Ended\|Actual QPS"
done

# With Istio
for c in 2 4 8 16 32 64 128 256; do
  echo "=== Concurrency: $c ==="
  kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
    fortio load -c $c -qps 0 -t 30s -json /tmp/istio-c${c}.json \
    http://echo-server.bench-istio:8080/echo 2>&1 | grep "Ended\|Actual QPS"
done
```

Plot the results. You should see throughput increase with concurrency up to a point, then plateau. The plateau is your maximum throughput. Compare the plateaus between plain and Istio.

## Data Throughput Test (Bytes Per Second)

For services that transfer large amounts of data, test with different payload sizes:

```bash
# Test data throughput with 1MB payloads
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 8 -qps 0 -t 30s -payload-size 1048576 \
  -json /tmp/istio-1mb.json \
  http://echo-server.bench-istio:8080/echo

kubectl exec -n bench-plain deploy/load-generator -c fortio -- \
  fortio load -c 8 -qps 0 -t 30s -payload-size 1048576 \
  -json /tmp/plain-1mb.json \
  http://echo-server.bench-plain:8080/echo
```

Calculate the data throughput:

```bash
# Extract throughput from results
for f in /tmp/plain-1mb.json /tmp/istio-1mb.json; do
  QPS=$(jq '.ActualQPS' "$f")
  SIZE=1048576
  THROUGHPUT=$(echo "$QPS * $SIZE / 1048576" | bc)
  echo "$f: ${THROUGHPUT} MB/s"
done
```

## HTTP/1.1 vs HTTP/2 Throughput

Istio supports HTTP/2 between proxies, which can significantly improve throughput through multiplexing. Test both:

```bash
# HTTP/1.1
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 30s -http1.0=false -http1.1=true \
  -json /tmp/h1-istio.json \
  http://echo-server.bench-istio:8080/echo

# HTTP/2 (using h2c)
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 30s -h2 \
  -json /tmp/h2-istio.json \
  http://echo-server.bench-istio:8080/echo
```

## gRPC Throughput Test

If your services use gRPC, test that specifically since it uses HTTP/2:

```bash
# Start a gRPC echo server (Fortio supports gRPC)
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 30s -grpc \
  -json /tmp/grpc-istio.json \
  echo-server.bench-istio:8079

kubectl exec -n bench-plain deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 30s -grpc \
  -json /tmp/grpc-plain.json \
  echo-server.bench-plain:8079
```

## Impact of Sidecar CPU on Throughput

One of the biggest levers for throughput is sidecar CPU allocation. Test different CPU limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
          limits:
            cpu: 500m
```

Run the throughput test, then increase the limit:

```yaml
          limits:
            cpu: 1000m
```

And run again. Then try:

```yaml
          limits:
            cpu: 2000m
```

You can also set CPU limits per pod using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyCPULimit: "2000m"
```

Plot throughput vs sidecar CPU to find the sweet spot where adding more CPU doesn't significantly increase throughput anymore.

## Impact of Telemetry on Throughput

Telemetry features (access logging, tracing, metrics) consume CPU in the proxy. Benchmark with different telemetry configurations:

### Full telemetry (default):

```bash
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 30s -json /tmp/full-telemetry.json \
  http://echo-server.bench-istio:8080/echo
```

### Minimal telemetry:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: minimal
  namespace: bench-istio
spec:
  accessLogging:
    - disabled: true
  tracing:
    - disableSpanReporting: true
```

```bash
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 30s -json /tmp/min-telemetry.json \
  http://echo-server.bench-istio:8080/echo
```

## Sustained Throughput Test

Short bursts can give misleading results because buffers haven't filled and GC hasn't kicked in. Run longer tests for sustained throughput:

```bash
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 0 -t 300s -json /tmp/sustained.json \
  http://echo-server.bench-istio:8080/echo
```

Monitor during the test:

```bash
# Watch sidecar CPU usage during the benchmark
kubectl top pods -n bench-istio --containers
```

## Analyzing Results

Create a comparison table from your results:

```bash
#!/bin/bash
echo "| Scenario | QPS (Plain) | QPS (Istio) | Overhead % |"
echo "|----------|-------------|-------------|------------|"

for c in 2 4 8 16 32 64 128 256; do
  PLAIN=$(jq '.ActualQPS' /tmp/plain-c${c}.json 2>/dev/null)
  ISTIO=$(jq '.ActualQPS' /tmp/istio-c${c}.json 2>/dev/null)
  if [ "$PLAIN" != "" ] && [ "$ISTIO" != "" ]; then
    OVERHEAD=$(echo "scale=1; (1 - $ISTIO / $PLAIN) * 100" | bc)
    echo "| c=$c | $PLAIN | $ISTIO | ${OVERHEAD}% |"
  fi
done
```

Typical throughput overhead ranges from 10-30% depending on configuration and workload. If you're seeing more than 30%, check your sidecar CPU limits first.

## Optimization Strategies

If the throughput impact is unacceptable:

1. **Increase sidecar CPU**: This is the most effective knob
2. **Use HTTP/2**: Multiplexing improves throughput over HTTP/1.1
3. **Reduce telemetry**: Disable access logging for high-throughput paths
4. **Connection pooling**: Configure connection pool sizes in DestinationRule
5. **Consider Istio ambient mode**: The sidecar-less mode eliminates per-pod proxy overhead

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: optimize-connections
  namespace: bench-istio
spec:
  host: echo-server
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
```

Setting `maxRequestsPerConnection: 0` means unlimited requests per connection, which maximizes connection reuse and reduces TLS handshake overhead.

Throughput benchmarking gives you the data you need to make informed decisions about Istio's resource allocation and configuration. Run these benchmarks in an environment that matches your production setup as closely as possible, and re-run them whenever you change Istio versions or configuration.
