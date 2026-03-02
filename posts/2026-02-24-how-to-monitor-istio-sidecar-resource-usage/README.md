# How to Monitor Istio Sidecar Resource Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Resource, Monitoring, Envoy, Kubernetes

Description: Practical techniques for monitoring CPU, memory, and network resource consumption of Istio sidecar proxies across your mesh.

---

Every pod in your Istio mesh runs an Envoy sidecar proxy alongside your application container. That sidecar consumes CPU, memory, and network resources. For a few pods, the overhead is negligible. But when you have hundreds or thousands of pods, sidecar resource usage adds up fast and can become a real cost and performance concern.

## Baseline Resource Consumption

A typical Istio sidecar consumes roughly 50-100MB of memory and a small fraction of a CPU core at idle. Under load, those numbers climb based on the number of services in your mesh, the request rate, and the complexity of your routing rules.

To see current resource usage across all sidecars:

```bash
kubectl top pods --containers --all-namespaces | grep istio-proxy
```

This gives you a quick snapshot, but for real monitoring you need Prometheus metrics and proper dashboards.

## Key Metrics to Track

### CPU Usage

```promql
# CPU usage per sidecar
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace)

# Total CPU consumed by all sidecars
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))

# CPU usage relative to requests
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (namespace)
/
sum(rate(container_cpu_usage_seconds_total{container!="istio-proxy",container!="POD",container!=""}[5m])) by (namespace)
```

The last query tells you what percentage of your total CPU budget goes to sidecars. If this ratio is climbing, your sidecars might need tuning.

### Memory Usage

```promql
# Working set memory per sidecar
container_memory_working_set_bytes{container="istio-proxy"} / 1024 / 1024

# RSS memory per sidecar
container_memory_rss{container="istio-proxy"} / 1024 / 1024

# Total memory used by all sidecars
sum(container_memory_working_set_bytes{container="istio-proxy"}) / 1024 / 1024 / 1024

# Average memory per sidecar
avg(container_memory_working_set_bytes{container="istio-proxy"}) / 1024 / 1024
```

### Network Usage

```promql
# Bytes received by sidecars
sum(rate(container_network_receive_bytes_total{pod=~".*",namespace!="kube-system"}[5m])) by (pod, namespace)

# Bytes transmitted by sidecars
sum(rate(container_network_transmit_bytes_total{pod=~".*",namespace!="kube-system"}[5m])) by (pod, namespace)
```

## Envoy-Internal Resource Metrics

Beyond Kubernetes container metrics, Envoy itself exposes resource-related stats:

```promql
# Envoy memory allocated
envoy_server_memory_allocated

# Envoy memory heap size
envoy_server_memory_heap_size

# Envoy total connections (affects memory)
envoy_server_total_connections

# Envoy active connections
envoy_cluster_upstream_cx_active
```

Access these from any sidecar:

```bash
kubectl exec deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep server.memory
```

## Setting Up Resource Limits

Based on your monitoring data, you should set appropriate resource requests and limits for sidecars. This is done globally through the Istio mesh config or per-workload with annotations:

### Global Configuration

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

### Per-Workload Override

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-high-traffic-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "1000m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

## Alerting on Sidecar Resource Issues

Set up alerts that fire before sidecars hit their limits:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-sidecar-resource-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-sidecar-resources
    rules:
    - alert: SidecarHighMemory
      expr: |
        container_memory_working_set_bytes{container="istio-proxy"}
        /
        kube_pod_container_resource_limits{container="istio-proxy",resource="memory"}
        > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar memory usage above 85%"
        description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} sidecar is using {{ $value | humanizePercentage }} of its memory limit"
    - alert: SidecarHighCPU
      expr: |
        rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])
        /
        kube_pod_container_resource_limits{container="istio-proxy",resource="cpu"}
        > 0.80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar CPU usage above 80%"
        description: "Pod {{ $labels.pod }} in {{ $labels.namespace }} sidecar is using {{ $value | humanizePercentage }} of its CPU limit"
    - alert: SidecarOOMKilled
      expr: |
        kube_pod_container_status_last_terminated_reason{container="istio-proxy",reason="OOMKilled"} == 1
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Sidecar was OOM killed"
        description: "The istio-proxy container in {{ $labels.pod }} was terminated due to out-of-memory"
```

## Building a Sidecar Resource Dashboard

```json
{
  "dashboard": {
    "title": "Istio Sidecar Resources",
    "panels": [
      {
        "title": "Total Sidecar Memory (GB)",
        "type": "stat",
        "targets": [{
          "expr": "sum(container_memory_working_set_bytes{container=\"istio-proxy\"}) / 1024 / 1024 / 1024"
        }]
      },
      {
        "title": "Total Sidecar CPU (cores)",
        "type": "stat",
        "targets": [{
          "expr": "sum(rate(container_cpu_usage_seconds_total{container=\"istio-proxy\"}[5m]))"
        }]
      },
      {
        "title": "Top 10 Sidecars by Memory",
        "type": "table",
        "targets": [{
          "expr": "topk(10, container_memory_working_set_bytes{container=\"istio-proxy\"} / 1024 / 1024)",
          "format": "table",
          "instant": true
        }]
      },
      {
        "title": "Top 10 Sidecars by CPU",
        "type": "table",
        "targets": [{
          "expr": "topk(10, rate(container_cpu_usage_seconds_total{container=\"istio-proxy\"}[5m]))",
          "format": "table",
          "instant": true
        }]
      },
      {
        "title": "Memory Usage Distribution",
        "type": "histogram",
        "targets": [{
          "expr": "container_memory_working_set_bytes{container=\"istio-proxy\"} / 1024 / 1024"
        }]
      },
      {
        "title": "Sidecar CPU vs App CPU",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{container=\"istio-proxy\"}[5m]))",
            "legendFormat": "Sidecar CPU"
          },
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"istio-proxy\",container!=\"POD\",container!=\"\"}[5m]))",
            "legendFormat": "Application CPU"
          }
        ]
      }
    ]
  }
}
```

## Reducing Sidecar Resource Usage

If your monitoring shows excessive resource consumption, here are concrete steps:

### Use Sidecar Resources to Limit Scope

By default, each sidecar gets configuration for every service in the mesh. Use the Sidecar resource to limit what each proxy knows about:

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
    - "other-namespace/needed-service.other-namespace.svc.cluster.local"
```

This dramatically reduces memory usage because the proxy only needs configuration for services it actually talks to.

### Tune Concurrency

By default, Envoy uses 2 worker threads. For low-traffic services, reducing this to 1 saves CPU:

```yaml
annotations:
  sidecar.istio.io/concurrency: "1"
```

### Adjust Stats Collection

Reduce the number of metrics Envoy tracks:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: my-namespace
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

Monitoring sidecar resource usage is not just about preventing outages. It is about understanding the true cost of your service mesh and making smart trade-offs between observability, security, and resource efficiency. Start with the basic metrics, add alerting, and refine your resource limits as you gather real-world data.
