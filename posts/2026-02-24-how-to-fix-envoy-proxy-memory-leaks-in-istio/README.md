# How to Fix Envoy Proxy Memory Leaks in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Memory Leak, Performance, Troubleshooting

Description: How to identify, diagnose, and resolve memory leaks in Envoy sidecar proxies running within an Istio service mesh.

---

You notice that the istio-proxy containers in your pods keep consuming more and more memory over time. Eventually they hit their memory limits and get OOMKilled, which restarts the proxy container and disrupts pod traffic. This is a common problem in Istio deployments, and while it sometimes looks like a memory leak, it's often caused by configuration issues.

## Is It Actually a Leak?

First, distinguish between a genuine memory leak and expected memory growth. Envoy uses memory for:

- Connection pools (one allocation per active connection)
- Route tables and cluster configurations
- Request/response buffering
- TLS session state
- Access log buffers
- Statistics and metrics

In a large cluster with many services, the baseline memory usage of the sidecar can be quite high just from the configuration alone.

Check current memory usage:

```bash
kubectl top pod <pod-name> -n my-namespace --containers
```

Or check the Envoy stats directly:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/memory
```

This returns details like allocated memory, heap size, and total memory mapped.

## Track Memory Over Time

Monitor the memory usage pattern. A genuine leak shows continuous growth even during steady-state traffic. Normal behavior shows memory stabilizing after an initial ramp-up.

Check Envoy's memory stats:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | grep "server.memory"
```

Key metrics to watch:
- `server.memory_allocated`: Current memory allocated
- `server.memory_heap_size`: Total heap size

If these keep growing without bound, you have a problem.

## Large Configuration Scope

The most common cause of high memory usage (that looks like a leak) is Envoy receiving configuration for too many services. In a cluster with 1000 services, every sidecar gets route, cluster, and endpoint configuration for all of them by default.

Check the config size:

```bash
istioctl proxy-config all <pod-name> -n my-namespace -o json | wc -c
```

If this is tens or hundreds of megabytes, you need to scope it down with a Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
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

This tells the proxy to only load configuration for services in its own namespace and istio-system. The memory savings can be dramatic.

Apply it to every namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "other-namespace/specific-service.other-namespace.svc.cluster.local"
```

Only include the specific cross-namespace services that the workload actually needs.

## Connection Pool Growth

If your service makes many outbound connections to different hosts, connection pools can consume a lot of memory. This is especially bad for services that connect to many external APIs.

Check active connections:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | grep "cx_active"
```

Set connection limits with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: connection-limits
  namespace: my-namespace
spec:
  host: "*.my-namespace.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
        maxRequestsPerConnection: 100
        idleTimeout: 60s
```

The `idleTimeout` is particularly important. Istio's default upstream connection pool idle timeout is 1 hour, so setting a shorter value can release idle connections sooner.

## Access Logging Overhead

If you have verbose access logging enabled, the log buffers can consume significant memory, especially under high traffic:

Check if access logging is enabled:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep accessLog
```

If you have detailed access logs enabled, consider switching to a more compact format or disabling them for high-traffic services:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-access-log
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: high-traffic-service
  accessLogging:
  - disabled: true
```

## Statistics Cardinality

Envoy generates metrics for every service, route, and cluster combination. In large meshes, the number of metrics can explode. Each metric consumes memory.

Check the number of stats:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | wc -l
```

If you have tens of thousands of stats, the overhead is significant. Reduce Istio standard metric cardinality by removing unneeded dimensions with the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metric-cardinality
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: high-traffic-service
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        response_code:
          operation: REMOVE
```

If you previously enabled broad optional Envoy stat prefixes, narrow them with `proxyStatsMatcher`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
        - ".*cx_active$"
```

## Wasm Extensions

If you're using WebAssembly (Wasm) extensions with Envoy, they can have their own memory leaks. Wasm plugins run in a sandbox but still allocate memory that Envoy manages.

Check if any Wasm plugins are loaded:

```bash
kubectl get wasmplugin -A
```

Try disabling Wasm plugins one at a time to identify if one is causing the leak.

## Set Memory Limits

Always set memory limits on the sidecar. This prevents a runaway proxy from affecting the node:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyMemoryLimit: "256Mi"
    sidecar.istio.io/proxyMemory: "128Mi"
```

For high-traffic services, you might need more:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyMemoryLimit: "1Gi"
    sidecar.istio.io/proxyMemory: "512Mi"
```

## Envoy Overload Manager

Envoy has a built-in overload manager that can take action when memory usage gets too high. You can configure it to start shedding load before hitting OOM:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: overload-manager
  namespace: istio-system
spec:
  configPatches:
  - applyTo: BOOTSTRAP
    patch:
      operation: MERGE
      value:
        overload_manager:
          refresh_interval: 0.25s
          resource_monitors:
          - name: "envoy.resource_monitors.fixed_heap"
            typed_config:
              '@type': type.googleapis.com/envoy.extensions.resource_monitors.fixed_heap.v3.FixedHeapConfig
              max_heap_size_bytes: 268435456
          actions:
          - name: "envoy.overload_actions.disable_http_keepalive"
            triggers:
            - name: "envoy.resource_monitors.fixed_heap"
              threshold:
                value: 0.92
          - name: "envoy.overload_actions.stop_accepting_requests"
            triggers:
            - name: "envoy.resource_monitors.fixed_heap"
              threshold:
                value: 0.95
          loadshed_points:
          - name: "envoy.load_shed_points.tcp_listener_accept"
            triggers:
            - name: "envoy.resource_monitors.fixed_heap"
              threshold:
                value: 0.95
```

This configures the overload manager to monitor heap usage against a 256MB limit, disable HTTP keepalive at 92% heap pressure, and start rejecting new work at 95%. EnvoyFilter patches are advanced and can be sensitive to Envoy and Istio version changes, so test them before rolling them out broadly.

## Restart Strategy

If you can't find the root cause quickly and need a workaround, setting proper memory limits ensures Kubernetes restarts the proxy container when it exceeds the limit. The standard Istio readiness endpoint on port 15021 checks proxy readiness, not memory usage, so a memory-triggered graceful restart needs separate automation or an explicit custom health check.

## Summary

Envoy memory growth in Istio is usually caused by large configuration scope (fix with Sidecar resources), large connection pools (fix with DestinationRule limits), or high stats cardinality (fix with Telemetry metric overrides and narrower Envoy stat matching). True memory leaks in Envoy are rare but can happen with specific features or Wasm plugins. Always set memory limits on the sidecar, and use the Sidecar resource to reduce configuration scope as a first step.
