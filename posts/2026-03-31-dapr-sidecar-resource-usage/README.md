# How to Monitor Dapr Sidecar Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Metric, Resource, Observability

Description: Monitor CPU and memory consumption of Dapr sidecar containers to right-size resource requests and identify performance bottlenecks.

---

Each Dapr sidecar (daprd) runs as a separate container alongside your application. Understanding its resource consumption helps you set accurate CPU and memory limits, avoid throttling, and identify noisy services.

## Why Monitor Sidecar Resource Usage

Without monitoring sidecar resources, you risk:
- OOMKilled sidecars causing service disruptions
- CPU throttling increasing latency
- Overprovisioned nodes driving up costs
- Difficulty identifying which services have high Dapr overhead

## Viewing Real-Time Resource Usage

Use kubectl top to get current resource consumption:

```bash
# View all containers in a pod including the daprd sidecar
kubectl top pod order-service-xxx --containers -n default
```

Output shows both your app container and the `daprd` container:

```text
POD                        NAME           CPU(cores)   MEMORY(bytes)
order-service-7d8f9c-xyz   order-service  15m          128Mi
order-service-7d8f9c-xyz   daprd          8m           64Mi
```

## Querying Sidecar Metrics with Prometheus

Use container-level metrics from cAdvisor (exposed via the kubelet):

```text
# CPU usage for all daprd containers
rate(container_cpu_usage_seconds_total{container="daprd"}[5m])

# Memory usage for all daprd containers
container_memory_working_set_bytes{container="daprd"}

# CPU throttling rate
rate(container_cpu_cfs_throttled_seconds_total{container="daprd"}[5m])
  / rate(container_cpu_usage_seconds_total{container="daprd"}[5m])
```

## Dapr's Own Resource Metrics

Dapr also exposes internal Go runtime metrics. Check for goroutine count and heap usage:

```text
# Go heap in use
go_memstats_heap_inuse_bytes{app="daprd"}

# Active goroutines
go_goroutines{app="daprd"}

# GC pause duration
go_gc_duration_seconds{app="daprd"}
```

## Setting Resource Requests and Limits

Use annotations to control sidecar resources:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service"
    dapr.io/sidecar-cpu-request: "100m"
    dapr.io/sidecar-memory-request: "64Mi"
    dapr.io/sidecar-cpu-limit: "300m"
    dapr.io/sidecar-memory-limit: "256Mi"
```

## Identifying High-Usage Services

Run this PromQL query to rank services by sidecar memory:

```text
topk(10,
  avg by (pod, namespace) (
    container_memory_working_set_bytes{container="daprd"}
  )
)
```

And by CPU:

```text
topk(10,
  avg by (pod, namespace) (
    rate(container_cpu_usage_seconds_total{container="daprd"}[5m])
  )
)
```

## Grafana Panel for Sidecar Resources

Add a panel to your Dapr Grafana dashboard:

```text
# Legend: {{pod}}
avg by (pod) (
  container_memory_working_set_bytes{container="daprd", namespace="$namespace"}
)
```

Set visualization to "Gauge" and unit to "bytes (IEC)" to show current usage per pod.

## Setting Alerts for Sidecar OOM Risk

```yaml
groups:
- name: dapr-sidecar
  rules:
  - alert: DaprSidecarHighMemory
    expr: |
      container_memory_working_set_bytes{container="daprd"}
        / container_spec_memory_limit_bytes{container="daprd"} > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Dapr sidecar memory above 85% of limit on {{ $labels.pod }}"
```

## Summary

Monitoring Dapr sidecar resource usage requires combining Kubernetes container metrics with Dapr's own Go runtime metrics. Use kubectl top for quick checks and Prometheus queries for trending and alerting. Set per-service resource limits via Dapr annotations and alert when memory approaches the limit to prevent OOMKilled events.
