# How to Monitor Dapr Sidecar Resource Consumption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Resource Management, Kubernetes, Performance

Description: Track CPU and memory consumption of Dapr sidecars across your cluster to optimize resource limits and identify runaway processes.

---

Every Dapr-enabled pod runs a `daprd` sidecar container. At scale, sidecar resource consumption adds up significantly. A single sidecar typically uses 50-200MB of memory and 5-50m CPU at steady state, but traffic spikes and memory leaks can cause overconsumption that starves your application containers. Monitoring sidecar resources proactively keeps clusters healthy.

## Key Sidecar Resource Metrics

Kubernetes exposes container-level usage metrics through cAdvisor (via kubelet). kube-state-metrics provides resource specifications via `kube_pod_container_resource_requests` and `kube_pod_container_resource_limits`. Key cAdvisor metrics for monitoring actual usage:

- `container_cpu_usage_seconds_total` - CPU time consumed
- `container_memory_working_set_bytes` - actual memory in use
- `container_memory_rss` - resident set size

Filter by the `daprd` container name to isolate sidecar metrics.

## Querying Sidecar Resource Usage

Check current sidecar CPU usage per pod:

```bash
kubectl top pods --containers -A | grep daprd
```

Use Prometheus to query average sidecar memory across namespaces:

```promql
avg(
  container_memory_working_set_bytes{container="daprd"}
) by (namespace, pod)
```

Find sidecars using more than 200MB:

```promql
container_memory_working_set_bytes{container="daprd"} > 200 * 1024 * 1024
```

## Setting Resource Limits and Requests

Configure sidecar resource limits via Dapr annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/sidecar-cpu-request: "50m"
        dapr.io/sidecar-cpu-limit: "200m"
        dapr.io/sidecar-memory-request: "64Mi"
        dapr.io/sidecar-memory-limit: "256Mi"
```

Note that when installing Dapr using Helm, no default sidecar resource limits or requests are set. The Dapr Configuration CRD also does not support cluster-wide sidecar resource defaults. Per-pod annotations (shown above) are the recommended way to configure sidecar resources for each deployment.

## Alerting on Sidecar Resource Overconsumption

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-sidecar-resource-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.sidecar.resources
      rules:
        - alert: DaprSidecarHighMemory
          expr: |
            container_memory_working_set_bytes{container="daprd"}
            / container_spec_memory_limit_bytes{container="daprd"}
            > 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Dapr sidecar memory near limit"
            description: "Pod {{ $labels.pod }} sidecar is using {{ $value | humanizePercentage }} of memory limit."

        - alert: DaprSidecarCPUThrottled
          expr: |
            rate(container_cpu_cfs_throttled_seconds_total{container="daprd"}[5m]) > 0.25
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Dapr sidecar CPU throttled"
            description: "Sidecar in pod {{ $labels.pod }} is CPU-throttled. Consider raising the CPU limit."
```

## Analyzing Memory Trends

Use Prometheus to detect memory leaks over time:

```bash
# Query memory growth over 1 hour window
# start and end must be RFC3339 or Unix timestamps
END=$(date +%s)
START=$(( END - 3600 ))
curl 'http://prometheus:9090/api/v1/query_range' \
  --data-urlencode 'query=container_memory_working_set_bytes{container="daprd"}' \
  --data-urlencode "start=${START}" \
  --data-urlencode "end=${END}" \
  --data-urlencode 'step=300'
```

## Summary

Monitoring Dapr sidecar resource consumption requires tracking CPU and memory metrics per container, setting appropriate limits via pod annotations, and alerting when sidecars approach their limits. Proactive resource management prevents sidecars from starving application containers and causing throttling-induced latency.
