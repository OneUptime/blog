# How to Benchmark Istio CPU Overhead per Pod

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Benchmarking, CPU, Performance, Kubernetes

Description: How to measure and optimize the CPU overhead that Istio sidecar proxies add to each pod under various traffic conditions and configurations.

---

CPU overhead from Istio sidecars directly affects two things: the performance of your services (if the sidecar is CPU-starved, it becomes a bottleneck) and the cost of your cluster (sidecar CPU usage adds up across all pods). Understanding exactly how much CPU each sidecar consumes under your specific traffic patterns helps you set resource limits correctly and plan capacity.

This post covers how to measure sidecar CPU overhead under different conditions and how to optimize it.

## How Sidecars Use CPU

The Envoy sidecar consumes CPU for several activities:

- **TLS handshakes**: The initial mTLS connection setup is CPU-intensive
- **Encryption/decryption**: Every byte of data gets encrypted (outbound) and decrypted (inbound)
- **Protocol parsing**: HTTP header parsing, routing decisions, load balancing
- **Telemetry**: Generating metrics, access logs, and trace spans
- **Configuration processing**: Handling xDS updates from istiod

The mix of these activities determines the CPU profile. A pod that handles many new connections (lots of TLS handshakes) has a different CPU profile than one that handles few connections with high throughput (mostly encryption/decryption).

## Measuring Baseline CPU Without Istio

Set up a baseline:

```bash
kubectl create namespace bench-plain
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
  namespace: bench-plain
spec:
  replicas: 3
  selector:
    matchLabels:
      app: echo-server
  template:
    metadata:
      labels:
        app: echo-server
    spec:
      containers:
        - name: app
          image: fortio/fortio:latest
          args: ["server"]
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "1"
            limits:
              cpu: "2"
```

Generate traffic and measure:

```bash
# Start traffic
kubectl exec -n bench-plain deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 500 -t 120s http://echo-server.bench-plain:8080/echo &

# Measure CPU
kubectl top pods -n bench-plain --containers
```

## Measuring Sidecar CPU With Istio

Deploy the same workload with Istio:

```bash
kubectl create namespace bench-istio
kubectl label namespace bench-istio istio-injection=enabled
kubectl apply -f echo-server.yaml -n bench-istio
kubectl apply -f load-generator.yaml -n bench-istio
```

Run the same traffic pattern:

```bash
# Start traffic
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 500 -t 120s http://echo-server.bench-istio:8080/echo &

# Measure CPU for both containers
kubectl top pods -n bench-istio --containers
```

You'll see CPU usage for both `app` and `istio-proxy` containers. The `istio-proxy` column is your sidecar overhead.

For more precise measurements over time, use Prometheus:

```promql
# CPU usage rate of istio-proxy containers (cores)
rate(container_cpu_usage_seconds_total{
  container="istio-proxy",
  namespace="bench-istio"
}[5m])
```

## CPU vs Request Rate

The most useful benchmark shows how sidecar CPU scales with request rate. Run tests at different QPS levels:

```bash
for qps in 100 200 500 1000 2000 5000; do
  echo "=== QPS: $qps ==="
  kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
    fortio load -c 16 -qps $qps -t 60s -json /tmp/qps-${qps}.json \
    http://echo-server.bench-istio:8080/echo &

  # Wait a bit for traffic to stabilize
  sleep 10

  # Capture CPU metrics
  kubectl top pods -n bench-istio --containers | grep echo-server | grep istio-proxy

  # Wait for test to finish
  wait
  sleep 5
done
```

Plot the results (QPS vs sidecar CPU). You should see a roughly linear relationship. The slope tells you the CPU cost per request.

## CPU vs Payload Size

Larger payloads require more encryption/decryption CPU:

```bash
for size in 100 1024 10240 102400 1048576; do
  echo "=== Payload: $size bytes ==="
  kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
    fortio load -c 8 -qps 100 -t 60s -payload-size $size \
    http://echo-server.bench-istio:8080/echo &

  sleep 10
  kubectl top pods -n bench-istio --containers | grep echo-server | grep istio-proxy
  wait
  sleep 5
done
```

## CPU Cost of mTLS

Measure the specific CPU cost of mTLS by comparing encrypted vs unencrypted traffic:

```yaml
# Disable mTLS for benchmarking
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: no-mtls
  namespace: bench-istio
spec:
  mtls:
    mode: DISABLE
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: no-mtls
  namespace: bench-istio
spec:
  host: "*.bench-istio.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: DISABLE
```

Run the benchmark without mTLS:

```bash
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 1000 -t 60s http://echo-server.bench-istio:8080/echo
```

Compare the CPU usage against the mTLS-enabled benchmark. The difference is the encryption overhead.

Remember to re-enable mTLS after benchmarking.

## CPU Cost of Telemetry Features

Test each telemetry feature individually to understand its CPU cost.

### Access Logging

Disable access logging:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: no-logging
  namespace: bench-istio
spec:
  accessLogging:
    - disabled: true
```

Run benchmark and compare CPU to the baseline with logging enabled.

### Tracing

Disable tracing:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: no-tracing
  namespace: bench-istio
spec:
  tracing:
    - disableSpanReporting: true
```

### Metrics

You can't fully disable metrics without losing visibility, but you can reduce the cardinality:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: reduced-metrics
  namespace: bench-istio
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_protocol:
              operation: REMOVE
            destination_canonical_revision:
              operation: REMOVE
```

## Sustained CPU Under Load

Short tests can miss CPU spikes from garbage collection and configuration pushes. Run a longer test:

```bash
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 500 -t 600s http://echo-server.bench-istio:8080/echo &

# Monitor CPU every 30 seconds for 10 minutes
for i in $(seq 1 20); do
  echo "=== $(date) ==="
  kubectl top pods -n bench-istio --containers | grep istio-proxy
  sleep 30
done
```

Look for CPU spikes. If you see occasional spikes much higher than the baseline, they're likely from xDS configuration pushes or Envoy's internal housekeeping.

## Using Prometheus for Detailed Analysis

Prometheus gives you much more detailed CPU analysis than `kubectl top`:

```promql
# Average sidecar CPU over 5 minutes
avg(rate(container_cpu_usage_seconds_total{
  container="istio-proxy",
  namespace="bench-istio"
}[5m])) by (pod)

# Peak sidecar CPU (1-minute granularity)
max_over_time(rate(container_cpu_usage_seconds_total{
  container="istio-proxy",
  namespace="bench-istio"
}[1m])[1h:])

# CPU throttling (indicates the sidecar is hitting its limit)
rate(container_cpu_cfs_throttled_seconds_total{
  container="istio-proxy",
  namespace="bench-istio"
}[5m])
```

CPU throttling is particularly important. If you see throttling, the sidecar doesn't have enough CPU and is becoming a bottleneck. Increase the CPU limit.

## Setting CPU Resource Limits

Based on your benchmarks, set appropriate CPU requests and limits.

The request should cover steady-state usage:

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
            cpu: 2000m
```

The limit should handle peak usage without throttling. A good rule of thumb is to set the limit at 3-5x the average usage.

For high-traffic pods, override per deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyCPULimit: "4000m"
```

## Cluster-Wide CPU Impact

Calculate the total CPU consumed by sidecars:

```promql
# Total sidecar CPU usage in cores
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))

# As a percentage of total cluster CPU
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))
/
sum(machine_cpu_cores) * 100
```

If sidecars are consuming more than 5-10% of your total cluster CPU, consider:

1. Using Sidecar resources to reduce the configuration scope
2. Reducing telemetry for non-critical workloads
3. Increasing the overall cluster capacity
4. Evaluating Istio ambient mode which eliminates per-pod sidecars

## Cost Optimization

Translate CPU overhead into actual cost:

```
Total sidecar CPU (cores) x Cost per CPU core per hour x Hours per month = Monthly cost
```

For example, if you have 1000 pods each using 100m (0.1 cores) for the sidecar:
- Total sidecar CPU: 100 cores
- At $0.05/core/hour (typical cloud pricing): $0.05 x 100 x 730 = $3,650/month

That's the cost of running Istio sidecars. The features you get (mTLS, observability, traffic management) are almost certainly worth it, but knowing the actual number helps you make informed decisions about where to optimize.

Benchmark your specific workloads, monitor the results over time, and adjust resource limits as your traffic patterns change. CPU overhead is not a fixed number. It changes with your traffic volume, message sizes, and Istio configuration.
