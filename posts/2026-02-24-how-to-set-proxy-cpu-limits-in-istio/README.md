# How to Set Proxy CPU Limits in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy CPU, Resource Limits, Kubernetes, Performance Tuning

Description: A practical guide to configuring CPU requests and limits for Istio sidecar proxies to balance performance with cluster resource efficiency.

---

Every Envoy sidecar proxy in your Istio mesh consumes CPU. The proxy handles TLS termination, routing decisions, load balancing, telemetry collection, and policy enforcement for every request flowing through it. Getting the CPU allocation right matters because under-provisioned proxies add latency to every request, while over-provisioned proxies waste resources across potentially thousands of pods.

## CPU Consumption Patterns

The Istio proxy CPU usage depends on:

- **Request rate** - More requests per second means more CPU. The relationship is roughly linear for HTTP/1.1 but less predictable for HTTP/2 with multiplexed streams.
- **TLS overhead** - mTLS adds CPU for encryption/decryption on both sides of every connection. The initial handshake is the most expensive part.
- **Telemetry collection** - Generating metrics and traces for every request has a CPU cost.
- **Number of routes** - Large route tables increase the per-request routing decision time.
- **Request size** - Larger request/response bodies need more CPU for buffering and inspection.

A sidecar handling a few hundred requests per second typically uses between 50m and 200m of CPU. High-throughput services can easily push into the 500m to 1 CPU range.

## Setting CPU Limits with Annotations

Set CPU requests and limits per workload using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: catalog-service
  template:
    metadata:
      labels:
        app: catalog-service
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "1000m"
    spec:
      containers:
      - name: catalog-service
        image: catalog-service:2.0
        ports:
        - containerPort: 8080
```

The `proxyCPU` annotation sets the request (guaranteed minimum) and `proxyCPULimit` sets the ceiling. Apply this and verify:

```bash
kubectl apply -f catalog-service.yaml

POD=$(kubectl get pod -l app=catalog-service -o jsonpath='{.items[0].metadata.name}')
kubectl get pod $POD -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}' | jq .
```

## Mesh-Wide CPU Defaults

Set defaults for all proxies through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: "100m"
          limits:
            cpu: "2000m"
```

```bash
istioctl install -f istio-config.yaml
```

Individual workloads can override these defaults using annotations.

## The Concurrency Setting

Envoy uses a multi-threaded architecture. The number of worker threads directly affects how much CPU the proxy can use:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      concurrency: 2
```

The `concurrency` setting defaults to 2. Setting it to 0 tells Envoy to use all available CPU cores. For most workloads, 2 threads is sufficient. Increase it for high-throughput services that need to handle many concurrent connections.

The concurrency setting interacts with CPU limits in an important way. If you set `concurrency: 4` but the CPU limit is `500m`, the four threads will compete for half a core and you will see worse performance than with 2 threads that have enough CPU each.

A good rule of thumb: set concurrency to match the number of cores your CPU limit allows. If your limit is 2 CPUs, set concurrency to 2.

## Measuring Proxy CPU Usage

Before setting limits, measure what your proxies actually use:

```bash
# Real-time CPU usage per container
kubectl top pods --containers -l app=catalog-service

# Or use Prometheus
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

Useful Prometheus queries:

```promql
# CPU usage per sidecar proxy
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])

# Average CPU across all proxies in a namespace
avg(rate(container_cpu_usage_seconds_total{container="istio-proxy", namespace="default"}[5m]))

# CPU usage relative to request
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]) / on(pod, namespace) container_spec_cpu_shares{container="istio-proxy"} * 1024

# P99 CPU usage
quantile(0.99, rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))
```

## CPU Throttling Detection

When a container hits its CPU limit, it gets throttled by the kernel. The container doesn't crash like with memory OOM, but requests get slower. Detect throttling with:

```promql
# Throttled CPU time
rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy"}[5m])

# Throttle periods as a percentage
rate(container_cpu_cfs_throttled_periods_total{container="istio-proxy"}[5m]) / rate(container_cpu_cfs_periods_total{container="istio-proxy"}[5m])
```

If throttling is above 10-20%, your CPU limit is too low and you are adding latency to requests.

## Impact on Request Latency

CPU throttling directly translates to higher P99 latency. Here is a simple test to see the effect:

```bash
# Deploy a load generator
kubectl run fortio --image=fortio/fortio -- load -qps 500 -t 120s -c 50 http://catalog-service/api

# Watch latency metrics during the test
# In Prometheus or Grafana, query:
# histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service="catalog-service.default.svc.cluster.local"}[1m]))
```

Run this test with different CPU limits and compare the latency. You will see a clear increase in P99 latency when the proxy is throttled.

## CPU Sizing by Workload Type

Different workloads need different CPU allocations:

**Low-traffic background workers:**

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "10m"
  sidecar.istio.io/proxyCPULimit: "200m"
```

**Standard API services (100-500 rps):**

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "100m"
  sidecar.istio.io/proxyCPULimit: "500m"
```

**High-throughput services (1000+ rps):**

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyCPULimit: "2000m"
```

**Ingress gateway proxies:**

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "1000m"
  sidecar.istio.io/proxyCPULimit: "4000m"
```

## Removing CPU Limits

Some teams choose to not set CPU limits at all, only requests. The reasoning is that CPU is a compressible resource (unlike memory, the container gets throttled, not killed), and limits prevent the proxy from using available CPU during spikes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: "100m"
          limits: {}
```

This is a valid strategy if your cluster nodes have enough CPU headroom and you rely on requests-based scheduling to keep nodes from being over-committed.

## Reducing CPU Consumption

If your proxies use too much CPU, try these approaches:

**Reduce telemetry overhead:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: false
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

**Limit the configuration scope:**

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: catalog-sidecar
spec:
  workloadSelector:
    labels:
      app: catalog-service
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This reduces the routing table size, which lowers the CPU cost per routing decision.

**Disable unused features:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""
    enableTracing: false
```

If you don't need access logs or tracing, turning them off frees up CPU.

## Helm-Based Configuration

For Helm installations:

```yaml
# values.yaml
global:
  proxy:
    resources:
      requests:
        cpu: "100m"
      limits:
        cpu: "1000m"
    concurrency: 2
```

```bash
helm upgrade istiod istio/istiod -n istio-system -f values.yaml
```

## Key Takeaways

Start by measuring actual CPU usage under production-like load. Set requests based on normal usage and limits based on peak usage with some headroom. Watch for CPU throttling as it silently degrades latency. And remember that every sidecar adds to the cluster total, so even small per-proxy savings multiply across hundreds of pods into meaningful cost reductions.
