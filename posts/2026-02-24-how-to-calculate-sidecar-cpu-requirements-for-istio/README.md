# How to Calculate Sidecar CPU Requirements for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar Proxy, CPU, Performance

Description: A hands-on guide to calculating and tuning Envoy sidecar CPU requirements in Istio based on throughput, TLS overhead, and traffic patterns.

---

CPU is the resource that most directly impacts your application's latency when running inside an Istio service mesh. Every request going through the Envoy sidecar proxy needs CPU cycles for connection handling, TLS encryption/decryption, header parsing, routing decisions, and telemetry collection. If you set CPU limits too low, you will see increased P99 latencies. Set them too high, and you waste cluster resources that could be running your actual application code.

Getting sidecar CPU requirements right requires understanding what drives CPU consumption in Envoy and how to measure it in your specific environment.

## What Uses CPU in an Envoy Sidecar

The sidecar proxy performs several CPU-intensive operations for each request:

- **TLS handshake and encryption**: mTLS adds roughly 0.5-1ms of latency per connection establishment
- **HTTP parsing**: Header parsing, route matching, and protocol handling
- **Load balancing**: Selecting upstream endpoints and managing connection pools
- **Telemetry collection**: Generating metrics, trace spans, and access log entries
- **Policy enforcement**: Authorization policy evaluation for each request
- **Header manipulation**: Adding, removing, or modifying headers based on VirtualService rules

Of these, TLS operations and telemetry collection tend to be the heaviest CPU consumers.

## Baseline CPU Consumption

An idle Envoy sidecar with no traffic uses very little CPU, typically under 5 millicores. The CPU usage scales primarily with requests per second (RPS) and connection rate.

Here are some rough benchmarks from real-world deployments:

| RPS per pod | CPU Usage (no mTLS) | CPU Usage (with mTLS) |
|---|---|---|
| 100 | 10-20m | 15-30m |
| 500 | 50-80m | 70-120m |
| 1,000 | 100-150m | 140-220m |
| 5,000 | 400-600m | 600-900m |
| 10,000 | 800-1200m | 1000-1500m |

These numbers assume typical HTTP/1.1 traffic with average request/response sizes around 1-5 KB. Larger payloads, HTTP/2 multiplexing, or gRPC streaming will shift these numbers.

## Measuring Current CPU Usage

Before calculating, measure what your sidecars are actually consuming:

```bash
# CPU usage across all sidecar containers
kubectl top pods --containers --all-namespaces | grep istio-proxy | sort -k4 -rn | head -20

# Get Envoy's own CPU stats
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/server_info
```

Prometheus queries give you better visibility over time:

```promql
# Current CPU usage per sidecar
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])

# Average CPU across all sidecars
avg(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))

# Top 10 CPU-consuming sidecars
topk(10, rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))

# CPU usage correlated with request rate
rate(istio_requests_total[5m])
```

## The CPU Calculation Formula

A practical formula for estimating sidecar CPU:

```
CPU (millicores) = Base + (RPS x Per_Request_Cost) + (New_Connections_Per_Sec x TLS_Handshake_Cost)

Where:
  Base = 5m
  Per_Request_Cost = 0.15m (without mTLS) or 0.25m (with mTLS) per request/sec
  TLS_Handshake_Cost = 2m per new connection/sec (for connection establishment)
```

Example for a service handling 1,000 RPS with mTLS enabled and 50 new connections per second:

```
CPU = 5m + (1000 x 0.25m) + (50 x 2m)
CPU = 5m + 250m + 100m
CPU = 355m
```

So you would want a request of about 400m and a limit of 800m to give headroom.

## Factors That Increase CPU Usage

Several configuration choices can significantly increase CPU consumption:

### Access Logging
Enabling access logs adds roughly 10-20% CPU overhead:

```yaml
apiVersion: networking.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

### Complex Authorization Policies
Each AuthorizationPolicy that matches a request adds evaluation time:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: complex-policy
spec:
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/frontend/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
      when:
        - key: request.headers[x-custom-header]
          values: ["allowed-value"]
```

### Wasm Extensions
If you are running WebAssembly extensions, they add CPU overhead that varies widely based on what the extension does. Measure each extension independently.

### Request Size
Larger request and response bodies require more CPU for proxying. A service that handles 10 KB average payloads uses roughly 2x the CPU of one handling 1 KB payloads at the same RPS.

## Setting CPU Resources

Configure globally through IstioOperator:

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
            cpu: "1000m"
```

Override per-workload with annotations:

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
        sidecar.istio.io/proxyCPULimit: "2000m"
    spec:
      containers:
        - name: high-traffic-service
          image: high-traffic-service:latest
```

## CPU Throttling Detection

When a sidecar hits its CPU limit, it gets throttled by the kernel's CFS scheduler. This shows up as increased latency, not as errors, which makes it sneaky to debug.

Detect throttling with:

```promql
# CPU throttling percentage per sidecar
rate(container_cpu_cfs_throttled_periods_total{container="istio-proxy"}[5m])
/ rate(container_cpu_cfs_periods_total{container="istio-proxy"}[5m])

# Alert when throttling exceeds 10%
rate(container_cpu_cfs_throttled_periods_total{container="istio-proxy"}[5m])
/ rate(container_cpu_cfs_periods_total{container="istio-proxy"}[5m]) > 0.1
```

If you see throttling, you need to either raise the CPU limit or reduce the load on that sidecar.

## Reducing CPU Overhead

If sidecar CPU usage is too high, consider these optimizations:

### 1. Reduce Telemetry Overhead

Disable metrics you do not need:

```yaml
apiVersion: networking.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: istio-system
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

### 2. Use Sidecar Resources to Limit Config Size

Smaller configuration means less CPU spent parsing and matching:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: istio-system
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

### 3. Connection Pooling

Encourage connection reuse to reduce TLS handshake overhead:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: connection-pool
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
```

Setting `maxRequestsPerConnection: 0` means connections are reused indefinitely, reducing the rate of new TLS handshakes.

## Sizing Recommendations by Workload Type

| Workload Type | CPU Request | CPU Limit |
|---|---|---|
| Low traffic (< 100 RPS) | 10m | 200m |
| Medium traffic (100-1000 RPS) | 100m | 1000m |
| High traffic (1000-5000 RPS) | 500m | 2000m |
| Very high traffic (5000+ RPS) | 1000m | 4000m |

Always validate these with actual measurements in your environment. The numbers above are starting points, not guarantees. Run load tests with realistic traffic patterns and adjust based on what you observe.
