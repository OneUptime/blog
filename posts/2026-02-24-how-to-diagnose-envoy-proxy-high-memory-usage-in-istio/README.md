# How to Diagnose Envoy Proxy High Memory Usage in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Memory, Performance, Troubleshooting, OOMKilled

Description: How to investigate and fix high memory consumption in Istio Envoy sidecar proxies before they get OOM killed by Kubernetes.

---

An Envoy sidecar that keeps growing in memory is a ticking time bomb. Eventually it hits the Kubernetes memory limit, gets OOM killed, and your pod restarts. This causes dropped connections and brief outages for the affected service. Understanding what drives Envoy memory usage helps you fix the problem before it reaches that point.

## Checking Current Memory State

Start by understanding the current situation:

```bash
# Container-level memory usage
kubectl top pod my-service-pod -n my-namespace --containers

# Detailed memory breakdown from Envoy
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "server.memory"

# Memory limits configured
kubectl get pod my-service-pod -n my-namespace \
  -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources.limits.memory}'
```

Envoy reports several memory metrics:

```bash
# Allocated memory (currently in use)
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "server.memory_allocated"

# Heap size (total heap reserved)
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "server.memory_heap_size"
```

The difference between heap size and allocated memory is fragmentation. A large gap suggests memory fragmentation issues.

## Common Causes of High Memory

### 1. Too Many Services in the Mesh

This is the number one cause of high sidecar memory. By default, every sidecar receives configuration for every service in the mesh. Each service means clusters, endpoints, routes, and listeners that the proxy has to keep in memory.

```bash
# Count what the proxy knows about
istioctl proxy-config cluster deploy/my-service -n my-namespace | wc -l
istioctl proxy-config endpoint deploy/my-service -n my-namespace | wc -l
istioctl proxy-config listener deploy/my-service -n my-namespace | wc -l
istioctl proxy-config route deploy/my-service -n my-namespace | wc -l
```

If you have hundreds or thousands of services, the fix is to scope down each proxy:

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

This single change can cut memory usage by 50-80% in large meshes because the proxy only loads configuration for services in its own namespace and istio-system.

### 2. High Connection Count

Each active connection consumes memory for buffers, TLS state, and metadata:

```bash
# Check active connections
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_cx_active\|upstream_cx_active"

# Total connections over time
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_cx_total\|upstream_cx_total"
```

If the active connection count is very high (thousands), connections might not be closing properly. Check for connection leaks in your application or misconfigured keepalive settings.

### 3. Large Headers or Request/Response Bodies

Envoy buffers headers and may buffer bodies depending on the configuration. If your services exchange large payloads, this drives up memory:

```bash
# Check request/response sizes
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_rq_rx_buf_flood\|upstream_rq_tx_buf_flood"
```

If you are streaming large bodies, make sure streaming is properly configured and Envoy is not buffering entire payloads in memory.

### 4. Stats and Metrics Cardinality

Each unique metric label combination consumes memory. High-cardinality labels (like per-path metrics or per-user-ID labels) cause stats to explode:

```bash
# Count total stats
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | wc -l
```

If you see tens of thousands of stats, reduce the cardinality:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-stats
  namespace: my-namespace
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        destination_canonical_revision:
          operation: REMOVE
        source_canonical_revision:
          operation: REMOVE
        request_protocol:
          operation: REMOVE
```

### 5. Access Log Buffers

If access logging is enabled with high traffic, log buffers consume memory:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET config_dump | grep -c "access_log"
```

Consider using file-based access logging with rotation instead of stdout, or disable access logging on high-traffic services where you do not need it.

## Checking for OOM Kill History

See if the sidecar has been OOM killed before:

```bash
# Check container status
kubectl get pod my-service-pod -n my-namespace -o json | \
  jq '.status.containerStatuses[] | select(.name=="istio-proxy") | {restartCount, lastState}'

# Check events
kubectl get events -n my-namespace --sort-by='.lastTimestamp' | grep OOM
```

If the `lastState.terminated.reason` is `OOMKilled`, you need to either reduce memory usage or increase the memory limit.

## Setting Appropriate Memory Limits

Based on your investigation, adjust the memory limits. For a proxy with normal configuration:

```yaml
# For small meshes (< 50 services)
annotations:
  sidecar.istio.io/proxyMemory: "64Mi"
  sidecar.istio.io/proxyMemoryLimit: "256Mi"

# For medium meshes (50-200 services)
annotations:
  sidecar.istio.io/proxyMemory: "128Mi"
  sidecar.istio.io/proxyMemoryLimit: "512Mi"

# For large meshes (200+ services) or high-traffic services
annotations:
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

## Monitoring Memory Trends

Set up dashboards and alerts for sidecar memory:

```promql
# Memory usage as percentage of limit
container_memory_working_set_bytes{container="istio-proxy"}
/
kube_pod_container_resource_limits{container="istio-proxy",resource="memory"}

# Memory growth rate (are we trending toward OOM?)
predict_linear(container_memory_working_set_bytes{container="istio-proxy"}[1h], 3600*4)

# Average sidecar memory across the mesh
avg(container_memory_working_set_bytes{container="istio-proxy"}) / 1024 / 1024

# Top memory consumers
topk(10, container_memory_working_set_bytes{container="istio-proxy"}) / 1024 / 1024
```

Alert before you hit the limit:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sidecar-memory-alert
spec:
  groups:
  - name: sidecar-memory
    rules:
    - alert: SidecarMemoryHigh
      expr: |
        container_memory_working_set_bytes{container="istio-proxy"}
        /
        kube_pod_container_resource_limits{container="istio-proxy",resource="memory"}
        > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar memory above 85% for {{ $labels.pod }}"
    - alert: SidecarMemoryGrowth
      expr: |
        predict_linear(container_memory_working_set_bytes{container="istio-proxy"}[1h], 3600*2)
        >
        kube_pod_container_resource_limits{container="istio-proxy",resource="memory"}
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar in {{ $labels.pod }} predicted to OOM within 2 hours"
```

## Envoy Memory Administration

Envoy has a built-in memory management endpoint:

```bash
# Get memory stats
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET memory

# Get server info including memory settings
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET server_info
```

## Investigation Checklist

1. Check current memory usage vs limits
2. Count clusters, endpoints, listeners, and routes in proxy config
3. Check active connection count
4. Check stats cardinality
5. Look for OOM kill history
6. Apply Sidecar resource to limit configuration scope
7. Reduce metric label cardinality
8. Adjust memory limits based on actual usage
9. Set up predictive alerting for memory growth

The biggest lever you have for controlling Envoy memory is the Sidecar resource. It is the first thing to try, and in most cases it solves the problem entirely. Every proxy knowing about every service in the mesh is convenient but wasteful, and in large meshes it becomes unsustainable.
