# How to Optimize Dapr Sidecar Resource Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resource, Optimization, Kubernetes, Cost

Description: Optimize Dapr sidecar resource allocation by right-sizing CPU and memory requests and limits per workload type to reduce cost without sacrificing reliability.

---

## Why Sidecar Resource Allocation Matters

Every Dapr-enabled pod includes a `daprd` sidecar container consuming CPU and memory. With default or inflated resource allocations across hundreds of pods, sidecar overhead becomes a significant portion of cluster cost. Precise right-sizing minimizes waste while maintaining performance.

## Understanding Dapr's Default Resource Usage

Dapr's memory footprint depends on:
- Number of loaded components (each adds 5-20 MB)
- Request throughput (higher RPS increases CPU usage)
- Tracing and metrics collection overhead
- Actor workloads (actor state caching)

Typical idle sidecar: 20-40 MB memory, 1-5m CPU
Typical active sidecar: 50-100 MB memory, 50-200m CPU

## Measuring Current Usage

Before changing allocations, measure actual consumption:

```bash
# Get current usage for all daprd containers
kubectl top pods --containers -A | grep daprd | \
  awk '{print $1, $2, $3, $4, $5}' | \
  sort -k4 -hr | head -20
```

Use the Prometheus query for a time-series view:

```text
# Memory over 24h by pod
max_over_time(
  container_memory_working_set_bytes{container="daprd"}[24h]
)
```

```text
# CPU over 24h
max_over_time(
  rate(container_cpu_usage_seconds_total{container="daprd"}[5m])[24h:]
)
```

## Right-Sizing by Workload Type

Set resource allocations based on workload characteristics:

```yaml
# Low-traffic internal service
annotations:
  dapr.io/sidecar-cpu-request: "25m"
  dapr.io/sidecar-cpu-limit: "200m"
  dapr.io/sidecar-memory-request: "32Mi"
  dapr.io/sidecar-memory-limit: "96Mi"
```

```yaml
# High-traffic API service
annotations:
  dapr.io/sidecar-cpu-request: "100m"
  dapr.io/sidecar-cpu-limit: "1000m"
  dapr.io/sidecar-memory-request: "64Mi"
  dapr.io/sidecar-memory-limit: "256Mi"
```

```yaml
# Actor-heavy service
annotations:
  dapr.io/sidecar-cpu-request: "200m"
  dapr.io/sidecar-cpu-limit: "2000m"
  dapr.io/sidecar-memory-request: "128Mi"
  dapr.io/sidecar-memory-limit: "512Mi"
```

## Using Vertical Pod Autoscaler for Recommendations

VPA can recommend resource allocations based on observed usage:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: orders-api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  updatePolicy:
    updateMode: "Off"  # Recommendation mode only
  resourcePolicy:
    containerPolicies:
    - containerName: daprd
      minAllowed:
        cpu: "25m"
        memory: "32Mi"
      maxAllowed:
        cpu: "2"
        memory: "512Mi"
```

View recommendations:

```bash
kubectl describe vpa orders-api-vpa | grep -A 10 "Recommendation"
```

## Setting Global Defaults with Helm

Override sidecar defaults cluster-wide during Dapr installation:

```yaml
# dapr-values.yaml
dapr_sidecar_injector:
  sidecarCPURequest: "50m"
  sidecarCPULimit: "500m"
  sidecarMemoryRequest: "64Mi"
  sidecarMemoryLimit: "256Mi"
```

```bash
helm upgrade dapr dapr/dapr -n dapr-system -f dapr-values.yaml
```

## Summary

Optimizing Dapr sidecar resource allocation starts with measuring actual CPU and memory consumption using `kubectl top` and Prometheus. Right-size by workload type - low-traffic services need minimal resources while actor-heavy services need more. Use VPA in recommendation mode to get data-driven allocation suggestions, and set cluster-wide defaults via Helm that individual deployments can override with annotations.
