# How to Tune Envoy Proxy Performance in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Performance, Tuning, Kubernetes

Description: Practical tips for tuning Envoy proxy performance in Istio to reduce latency overhead and handle high-throughput workloads.

---

Adding a sidecar proxy to every pod introduces some overhead. For most services, this overhead is negligible - typically a few milliseconds of added latency. But for high-throughput, latency-sensitive workloads, those milliseconds matter. Tuning Envoy's performance can significantly reduce the sidecar tax and make Istio viable even for demanding applications.

## Measuring the Baseline

Before tuning anything, measure your current overhead. Deploy a simple test application and compare latency with and without the sidecar:

```bash
# Check latency through the sidecar
kubectl exec <client-pod> -- curl -w "@/dev/stdin" -o /dev/null -s http://server:8080/api <<'EOF'
    time_connect:  %{time_connect}s\n
   time_starttlt:  %{time_starttransfer}s\n
       time_total:  %{time_total}s\n
EOF
```

Look at the p50, p95, and p99 latency from Istio metrics:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_time"
```

## Concurrency (Worker Threads)

The number of worker threads directly affects how many connections Envoy can handle concurrently. By default, Istio sets concurrency to 2.

For CPU-intensive workloads or high connection counts, increase it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 0  # Use all available CPUs
```

Setting concurrency to 0 tells Envoy to use the number of CPUs available to the container. Make sure your resource limits reflect this:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
    spec:
      containers:
      - name: istio-proxy
        resources:
          requests:
            cpu: "2"
            memory: 256Mi
          limits:
            cpu: "4"
            memory: 512Mi
```

More worker threads means more CPU usage, so balance between performance and resource consumption.

## Resource Allocation

Undersized Envoy containers lead to CPU throttling and increased latency. Set appropriate resource requests and limits:

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
            memory: 128Mi
          limits:
            cpu: "2"
            memory: 1Gi
```

Per-pod overrides:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyCPULimit: "2000m"
  sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

Check if Envoy is being throttled:

```bash
kubectl top pod <pod-name> --containers
```

## Connection Pool Tuning

Envoy maintains connection pools to upstream services. Tuning these pools reduces connection setup overhead:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: high-perf-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
          probes: 9
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
        maxRetries: 3
        idleTimeout: 300s
```

Setting `maxRequestsPerConnection: 0` means connections are reused indefinitely, which avoids the overhead of creating new connections.

## HTTP/2 Tuning

Envoy uses HTTP/2 between sidecars for mTLS connections. Tune the HTTP/2 settings for better throughput:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-tuning
  namespace: istio-system
spec:
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: MERGE
      value:
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options:
                max_concurrent_streams: 100
                initial_stream_window_size: 1048576
                initial_connection_window_size: 1048576
```

## Reducing Configuration Size

Large meshes generate a lot of Envoy configuration. Each sidecar receives configuration for every service in the mesh by default, even if the pod never communicates with most of them. This increases memory usage and config push latency.

Use Sidecar resources to limit the scope:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-app-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  egress:
  - hosts:
    - "./backend.default.svc.cluster.local"
    - "./database.default.svc.cluster.local"
    - "istio-system/*"
```

This tells istiod to only send configuration for the specified services to this sidecar. For large meshes with hundreds of services, this can reduce memory usage by 50% or more.

Apply a default Sidecar resource to the namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: default
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This limits each sidecar in the default namespace to only know about services in its own namespace and istio-system.

## Disabling Unnecessary Features

If you do not use certain Istio features, disable them to reduce overhead:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: false
    enablePrometheusMerge: false
    defaultConfig:
      tracing:
        sampling: 0
```

Disable protocol sniffing if all your services use known protocols:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    protocolDetectionTimeout: 0s
```

## Stats Reduction

Envoy generates thousands of metrics by default. Reducing the stats that get tracked saves CPU and memory:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
        - "cluster.outbound"
        - "cluster.inbound"
        - "listener"
        - "http"
```

Only include the stats prefixes you actually use for dashboards and alerts.

## DNS Proxy

Istio's DNS proxy can reduce DNS lookup latency by caching DNS results in the sidecar:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

This is particularly helpful when your applications make frequent DNS lookups.

## Monitoring Performance Metrics

Track these Envoy stats to understand performance:

```bash
# Connection pool usage
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "cx_active\|cx_connect_fail\|rq_total"

# Request latency
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_time"

# Memory usage
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/memory

# Check for overloaded workers
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep "server.total_connections\|server.days_until_first_cert_expiring"
```

Performance tuning is iterative. Start with resource allocation and concurrency, then move to connection pool tuning and configuration size reduction. Measure after each change to confirm it actually helps. The Sidecar resource for limiting configuration scope is often the single biggest improvement for large meshes.
