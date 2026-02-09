# How to Configure Resource Requests Based on Historical Usage Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Optimization

Description: Learn how to analyze historical resource usage data and configure accurate resource requests in Kubernetes to improve scheduling efficiency and reduce wasted capacity.

---

Setting resource requests without data is guesswork. You either over-provision and waste money on unused capacity, or under-provision and suffer from poor scheduling and performance issues. Historical usage patterns reveal actual resource consumption, letting you configure requests that match reality.

Most applications use far less CPU and memory than their configured requests suggest. A pod requesting 4 CPU cores might average 800 millicores with occasional spikes to 1.5 cores. That gap between request and usage represents wasted cluster capacity that prevents other pods from scheduling.

## Collecting Historical Metrics

You need at least two weeks of metrics to capture usage patterns, including weekend versus weekday differences and any periodic batch jobs. Metrics-server provides basic resource usage, but Prometheus gives you the historical data needed for analysis.

Deploy Prometheus with sufficient retention:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--storage.tsdb.retention.time=30d'
        - '--web.enable-lifecycle'
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-storage
```

Configure the kubelet to expose cAdvisor metrics:

```bash
# cAdvisor metrics are available at the kubelet endpoint
# Ensure your Prometheus scrape config includes kubelet targets
```

## Analyzing CPU Usage Patterns

Query Prometheus for CPU usage over the past 14 days to understand patterns:

```promql
# P95 CPU usage per container
quantile_over_time(0.95,
  rate(container_cpu_usage_seconds_total{container!=""}[5m])
[14d:5m])

# Average CPU usage per container
avg_over_time(
  rate(container_cpu_usage_seconds_total{container!=""}[5m])
[14d:5m])

# Maximum CPU usage per container
max_over_time(
  rate(container_cpu_usage_seconds_total{container!=""}[5m])
[14d:5m])
```

Compare these values against current resource requests:

```promql
# CPU request vs actual usage ratio
(
  avg_over_time(rate(container_cpu_usage_seconds_total{container!=""}[5m])[14d:5m])
  /
  avg(kube_pod_container_resource_requests{resource="cpu"}) by (namespace, pod, container)
) * 100
```

A ratio below 50% indicates significant overprovisioning. A ratio above 90% suggests you're running close to limits and might need more headroom.

## Analyzing Memory Usage Patterns

Memory analysis requires different metrics since memory isn't released as freely as CPU:

```promql
# P95 memory usage per container
quantile_over_time(0.95,
  container_memory_working_set_bytes{container!=""}
[14d:5m])

# Average memory usage
avg_over_time(
  container_memory_working_set_bytes{container!=""}
[14d:5m])

# Memory request vs usage
(
  avg_over_time(container_memory_working_set_bytes{container!=""}[14d:5m])
  /
  avg(kube_pod_container_resource_requests{resource="memory"}) by (namespace, pod, container)
) * 100
```

Use `container_memory_working_set_bytes` instead of `container_memory_usage_bytes` because working set excludes cache that can be reclaimed.

## Creating a Resource Recommendation Script

Automate the analysis with a script that queries Prometheus and generates recommendations:

```python
#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus.monitoring.svc:9090"
LOOKBACK_DAYS = 14

def query_prometheus(query):
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )
    return response.json()["data"]["result"]

def get_cpu_recommendations():
    # Query P95 CPU usage over lookback period
    query = f'''
    quantile_over_time(0.95,
      rate(container_cpu_usage_seconds_total{{container!=""}}[5m])
    [{LOOKBACK_DAYS}d:5m])
    '''

    results = query_prometheus(query)
    recommendations = []

    for result in results:
        labels = result["metric"]
        p95_usage = float(result["value"][1])

        # Add 20% headroom for spikes
        recommended_request = p95_usage * 1.2

        # Get current request
        current_query = f'''
        kube_pod_container_resource_requests{{
          namespace="{labels.get('namespace')}",
          pod="{labels.get('pod')}",
          container="{labels.get('container')}",
          resource="cpu"
        }}
        '''
        current = query_prometheus(current_query)
        current_request = float(current[0]["value"][1]) if current else 0

        if current_request > 0:
            savings = ((current_request - recommended_request) / current_request) * 100

            recommendations.append({
                "namespace": labels.get("namespace"),
                "pod": labels.get("pod"),
                "container": labels.get("container"),
                "current_cpu_request": f"{current_request:.3f}",
                "recommended_cpu_request": f"{recommended_request:.3f}",
                "potential_savings": f"{savings:.1f}%"
            })

    return recommendations

def get_memory_recommendations():
    # Query P95 memory usage
    query = f'''
    quantile_over_time(0.95,
      container_memory_working_set_bytes{{container!=""}}
    [{LOOKBACK_DAYS}d:5m])
    '''

    results = query_prometheus(query)
    recommendations = []

    for result in results:
        labels = result["metric"]
        p95_usage_bytes = float(result["value"][1])

        # Add 30% headroom for memory (more conservative)
        recommended_request_bytes = p95_usage_bytes * 1.3
        recommended_request_mi = recommended_request_bytes / (1024 * 1024)

        # Get current request
        current_query = f'''
        kube_pod_container_resource_requests{{
          namespace="{labels.get('namespace')}",
          pod="{labels.get('pod')}",
          container="{labels.get('container')}",
          resource="memory"
        }}
        '''
        current = query_prometheus(current_query)
        current_request_bytes = float(current[0]["value"][1]) if current else 0
        current_request_mi = current_request_bytes / (1024 * 1024)

        if current_request_bytes > 0:
            savings = ((current_request_bytes - recommended_request_bytes) / current_request_bytes) * 100

            recommendations.append({
                "namespace": labels.get("namespace"),
                "pod": labels.get("pod"),
                "container": labels.get("container"),
                "current_memory_request": f"{current_request_mi:.0f}Mi",
                "recommended_memory_request": f"{recommended_request_mi:.0f}Mi",
                "potential_savings": f"{savings:.1f}%"
            })

    return recommendations

def main():
    print("Analyzing CPU usage patterns...")
    cpu_recs = get_cpu_recommendations()

    print("\nAnalyzing memory usage patterns...")
    memory_recs = get_memory_recommendations()

    # Filter for significant savings opportunities (>20%)
    significant_cpu = [r for r in cpu_recs if float(r["potential_savings"].rstrip('%')) > 20]
    significant_memory = [r for r in memory_recs if float(r["potential_savings"].rstrip('%')) > 20]

    print(f"\nFound {len(significant_cpu)} CPU optimization opportunities")
    print(f"Found {len(significant_memory)} memory optimization opportunities")

    # Export to JSON
    with open("resource-recommendations.json", "w") as f:
        json.dump({
            "cpu_recommendations": significant_cpu,
            "memory_recommendations": significant_memory,
            "generated_at": datetime.now().isoformat()
        }, f, indent=2)

    print("\nRecommendations saved to resource-recommendations.json")

if __name__ == "__main__":
    main()
```

Run this script weekly to identify optimization opportunities:

```bash
python3 analyze-resources.py
cat resource-recommendations.json | jq '.cpu_recommendations[] | select(.potential_savings | tonumber > 30)'
```

## Applying Resource Request Updates

Once you have recommendations, update your deployment manifests. Don't blindly apply all recommendations - start with the most overprovisioned workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        image: api-server:latest
        resources:
          requests:
            cpu: "800m"      # Was 2000m, reduced based on P95 usage
            memory: "1536Mi" # Was 4096Mi, reduced based on P95 usage
          limits:
            cpu: "2000m"     # Keep higher limit for bursts
            memory: "3072Mi" # Keep headroom for spikes
```

Deploy changes gradually using rolling updates. Monitor for increased CPU throttling or OOMKills:

```bash
# Watch for CPU throttling
kubectl exec -it prometheus-pod -n monitoring -- promtool query instant \
  'rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0.1'

# Watch for OOMKills
kubectl get events --all-namespaces | grep OOMKilled
```

## Using Vertical Pod Autoscaler

VPA can automatically apply recommendations from historical usage:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: "200m"
        memory: "512Mi"
      maxAllowed:
        cpu: "4000m"
        memory: "8Gi"
      controlledResources: ["cpu", "memory"]
```

VPA observes actual usage and periodically updates pod resource requests. It respects the min/max boundaries you configure.

## Handling Workloads with Variable Patterns

Some workloads have highly variable usage:

**Time-based patterns**: Batch jobs that run hourly or daily
**Traffic-based patterns**: Web applications with peak hours
**Event-driven patterns**: Queue processors that burst with load

For these workloads, set requests based on typical usage and use Horizontal Pod Autoscaler (HPA) to handle bursts:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: variable-workload-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: variable-workload
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

This keeps resource requests efficient while scaling replicas for demand.

## Creating Alerts for Request/Usage Drift

Set up alerts when actual usage significantly diverges from requests:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resource-request-alerts
spec:
  groups:
  - name: resource-efficiency
    rules:
    - alert: CPURequestTooHigh
      expr: |
        (
          rate(container_cpu_usage_seconds_total{container!=""}[5m])
          /
          kube_pod_container_resource_requests{resource="cpu"}
        ) < 0.3
      for: 1h
      labels:
        severity: info
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} using <30% of CPU request"

    - alert: MemoryRequestTooHigh
      expr: |
        (
          container_memory_working_set_bytes{container!=""}
          /
          kube_pod_container_resource_requests{resource="memory"}
        ) < 0.4
      for: 1h
      labels:
        severity: info
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} using <40% of memory request"
```

These alerts help you identify optimization opportunities as they emerge.

## Conclusion

Historical usage analysis transforms resource request configuration from guesswork into data-driven decision making. By collecting metrics over meaningful time periods, analyzing patterns with appropriate percentiles, and gradually applying recommendations, you can dramatically improve cluster efficiency without compromising application performance. The combination of Prometheus for historical data, automated analysis scripts, and VPA for ongoing optimization creates a sustainable resource management practice that adapts to changing workload patterns.
