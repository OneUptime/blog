# How to Debug Data Plane Memory Leaks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Memory Leaks, Envoy, Debugging, Kubernetes

Description: Practical steps to identify, diagnose, and fix memory leaks in Istio's Envoy sidecar proxies using stats, heap profiling, and configuration tuning.

---

Memory leaks in the data plane can sneak up on you. Your Envoy sidecars start out using 50MB of memory, and over the course of a few days they are at 500MB and climbing. Eventually they hit their memory limit, get OOMKilled, and your application loses traffic. Finding the root cause takes some detective work, but the tools are there if you know where to look.

## Recognizing a Memory Leak

The first sign is usually increasing memory usage over time. Use Prometheus to track sidecar memory:

```promql
container_memory_working_set_bytes{container="istio-proxy", namespace="default"}
```

If you see a steadily increasing line that never comes back down, you probably have a memory leak. Normal memory usage should stabilize after the initial startup period.

You can also check memory directly:

```bash
kubectl top pod -n default --containers | grep istio-proxy | sort -k4 -h
```

Or check the memory stats from inside the proxy:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/memory
```

This endpoint returns the current allocated and heap memory sizes.

## Common Causes of High Memory Usage

Before jumping to "leak," check these common causes of high memory usage that are not actually leaks:

### Large Mesh Configuration

Each Envoy sidecar receives configuration for services it might need to communicate with. In a mesh with thousands of services, this configuration alone can consume hundreds of megabytes.

Check the config size:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/config_dump | wc -c
```

If this returns something like 200MB, your sidecar is carrying configuration for a lot of services. Fix this with a Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This limits the proxy to only know about services in its own namespace and istio-system, dramatically reducing memory usage.

### Many Active Connections

Each active connection consumes memory for buffers. If your service handles thousands of concurrent connections, the memory usage will be proportionally higher.

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "downstream_cx_active"
```

### Access Log Buffering

If access logging is enabled and the log destination is slow, Envoy may buffer log entries in memory:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "access_log"
```

## Enabling Heap Profiling

If you have confirmed that memory is growing continuously and the common causes above do not explain it, you need to profile the heap. Envoy supports heap profiling with tcmalloc.

First, check if heap profiling is available:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/heap_dump
```

If it is not enabled, you may need to set the `ENVOY_HEAP_PROFILE` environment variable. Add it through the sidecar proxy configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
        proxy.istio.io/config: |
          proxyMetadata:
            ENVOY_HEAP_PROFILE: "/tmp/envoy_heap"
```

Once the pod is running with this configuration, you can trigger a heap dump:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s -X POST localhost:15000/heap_dump
```

Then copy it out for analysis:

```bash
kubectl cp default/my-app-xyz:/tmp/envoy_heap.0001.heap ./heap_profile -c istio-proxy
```

## Analyzing the Heap Profile

You need the `pprof` tool to analyze the heap dump. If you have Go installed:

```bash
go tool pprof heap_profile
```

Or use the standalone pprof:

```bash
pprof --text heap_profile
```

Look for allocation sites that are consuming the most memory. Common culprits include:

- Route table entries (too many routes being pushed)
- TLS session caches (lots of unique TLS connections)
- Stats memory (too many unique stat names from high-cardinality labels)
- Connection buffers (connection pool not limiting connections)

## Stats Cardinality Issues

One of the most common causes of memory growth in Envoy is stats cardinality. Every unique combination of metric labels creates a separate stats entry in memory. If you have a metric with a label that has thousands of unique values (like a request ID or user ID), the stats memory will grow unbounded.

Check the total number of stats:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | wc -l
```

If this number is very high (over 100,000), you have a cardinality problem.

Istio lets you control which stats are generated through the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: reduce-stats
  namespace: default
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        request_host:
          operation: REMOVE
```

This removes the `request_host` label from all metrics, which can be a high-cardinality label if your services handle requests for many different host headers.

## Connection Pool Tuning

If memory growth correlates with traffic volume, the issue might be unbounded connection pools. Limit them with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: limit-connections
spec:
  host: "*.default.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 100
```

The `maxRequestsPerConnection` setting is particularly useful. It forces connections to be closed and recreated after a certain number of requests, which prevents connection-related memory from growing indefinitely.

## Setting Memory Limits

Always set memory limits on the sidecar to prevent a leak from consuming all the node's memory:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
        sidecar.istio.io/proxyMemory: "128Mi"
```

When the sidecar hits the memory limit, it gets OOMKilled and Kubernetes restarts it. This is not great, but it is better than consuming all the node's memory and affecting other pods.

## Overload Manager

Envoy has an overload manager that can take protective actions when resource usage gets too high. You can configure it to stop accepting new connections before hitting the memory limit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 2
```

Reducing concurrency (the number of worker threads) can help limit memory usage since each thread maintains its own caches and buffers.

## Tracking Memory Over Time

Set up a dashboard that tracks sidecar memory for all pods in a namespace:

```promql
# Memory usage trend for sidecars
container_memory_working_set_bytes{container="istio-proxy", namespace="default"}

# Memory limit to overlay
kube_pod_container_resource_limits{container="istio-proxy", resource="memory", namespace="default"}
```

Set up an alert that fires when memory crosses a threshold:

```yaml
groups:
- name: istio-sidecar-memory
  rules:
  - alert: SidecarMemoryGrowing
    expr: |
      predict_linear(container_memory_working_set_bytes{container="istio-proxy"}[6h], 24*3600) >
      kube_pod_container_resource_limits{container="istio-proxy", resource="memory"} * 0.9
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Sidecar memory predicted to hit 90% of limit within 24 hours"
```

This alert uses linear prediction to warn you before the sidecar actually hits its limit.

Debugging memory leaks in the data plane requires patience and systematic investigation. Start with the easy wins like checking mesh configuration size and connection counts, then move to heap profiling if needed. Most of the time, the issue is not a bug in Envoy but a configuration problem like high stats cardinality or an overly broad Sidecar scope.
