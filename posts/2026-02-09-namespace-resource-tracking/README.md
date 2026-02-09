# How to Use Namespace Resource Consumption Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Monitoring

Description: Learn how to implement comprehensive namespace resource tracking in Kubernetes to understand consumption patterns, implement chargeback, and optimize resource allocation across teams.

---

Multi-tenant clusters need visibility into which teams or applications consume resources. Namespace resource tracking provides this visibility, enabling chargeback, identifying waste, and making informed capacity decisions. Without tracking, you can't answer basic questions like "how much does the data science team's workloads cost us?" or "which namespace grew resource usage by 300% last month?"

Namespaces provide natural boundaries for resource tracking. Each team, application, or environment gets a namespace, and you track resource consumption at that level. This data drives cost allocation, capacity planning, and optimization efforts.

## Setting Up Resource Quotas for Tracking

Resource quotas limit namespace consumption while providing tracking points:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: data-science
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    persistentvolumeclaims: "20"
    requests.storage: "500Gi"
    pods: "100"
    services: "20"
    services.loadbalancers: "5"
```

This quota caps resources but also creates a tracking mechanism. Query quota usage to see consumption:

```bash
# View quota usage
kubectl describe resourcequota team-quota -n data-science

# Output shows:
# Name:                   team-quota
# Namespace:              data-science
# Resource                Used   Hard
# --------                ----   ----
# limits.cpu              145    200
# limits.memory           280Gi  400Gi
# persistentvolumeclaims  12     20
# pods                    45     100
# requests.cpu            72     100
# requests.memory         140Gi  200Gi
# requests.storage        320Gi  500Gi
```

## Implementing Comprehensive Metrics Collection

Use Prometheus to track namespace resource usage over time:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-namespace-rules
  namespace: monitoring
data:
  namespace-resources.rules: |
    groups:
    - name: namespace-resources
      interval: 30s
      rules:
      # CPU requests by namespace
      - record: namespace:cpu_requests:sum
        expr: |
          sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)

      # Memory requests by namespace
      - record: namespace:memory_requests:sum
        expr: |
          sum(kube_pod_container_resource_requests{resource="memory"}) by (namespace)

      # Actual CPU usage by namespace
      - record: namespace:cpu_usage:sum
        expr: |
          sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace)

      # Actual memory usage by namespace
      - record: namespace:memory_usage:sum
        expr: |
          sum(container_memory_working_set_bytes{container!=""}) by (namespace)

      # Storage usage by namespace
      - record: namespace:storage_usage:sum
        expr: |
          sum(kubelet_volume_stats_used_bytes) by (namespace)

      # Pod count by namespace
      - record: namespace:pod_count:sum
        expr: |
          count(kube_pod_info) by (namespace)

      # CPU efficiency (usage vs requests)
      - record: namespace:cpu_efficiency:ratio
        expr: |
          namespace:cpu_usage:sum / namespace:cpu_requests:sum

      # Memory efficiency (usage vs requests)
      - record: namespace:memory_efficiency:ratio
        expr: |
          namespace:memory_usage:sum / namespace:memory_requests:sum
```

These recording rules pre-compute namespace metrics for fast querying.

## Building a Resource Tracking Dashboard

Create a Grafana dashboard for namespace resource visibility:

```json
{
  "dashboard": {
    "title": "Namespace Resource Tracking",
    "panels": [
      {
        "title": "CPU Requests by Namespace",
        "targets": [{
          "expr": "topk(10, namespace:cpu_requests:sum)",
          "legendFormat": "{{ namespace }}"
        }],
        "type": "graph"
      },
      {
        "title": "Memory Usage by Namespace",
        "targets": [{
          "expr": "topk(10, namespace:memory_usage:sum / 1024 / 1024 / 1024)",
          "legendFormat": "{{ namespace }}"
        }],
        "type": "graph"
      },
      {
        "title": "Resource Efficiency",
        "targets": [
          {
            "expr": "namespace:cpu_efficiency:ratio",
            "legendFormat": "CPU - {{ namespace }}"
          },
          {
            "expr": "namespace:memory_efficiency:ratio",
            "legendFormat": "Memory - {{ namespace }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Storage Consumption",
        "targets": [{
          "expr": "namespace:storage_usage:sum / 1024 / 1024 / 1024",
          "legendFormat": "{{ namespace }}"
        }],
        "type": "bar"
      }
    ]
  }
}
```

## Implementing Cost Allocation

Calculate costs based on resource consumption:

```python
#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus.monitoring.svc:9090"

# Cloud provider costs (example rates)
CPU_CORE_HOUR_COST = 0.03  # $0.03 per core-hour
MEMORY_GB_HOUR_COST = 0.004  # $0.004 per GB-hour
STORAGE_GB_MONTH_COST = 0.10  # $0.10 per GB-month

def query_prometheus(query, lookback_hours=720):
    """Query Prometheus for the last 720 hours (30 days)"""
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )
    return response.json()["data"]["result"]

def calculate_namespace_costs():
    """Calculate costs for each namespace"""

    # Query average CPU requests over 30 days
    cpu_query = "avg_over_time(namespace:cpu_requests:sum[30d])"
    cpu_results = query_prometheus(cpu_query)

    # Query average memory requests over 30 days
    memory_query = "avg_over_time(namespace:memory_requests:sum[30d])"
    memory_results = query_prometheus(memory_query)

    # Query storage usage
    storage_query = "avg_over_time(namespace:storage_usage:sum[30d])"
    storage_results = query_prometheus(storage_query)

    costs = {}

    # Calculate CPU costs
    for result in cpu_results:
        namespace = result["metric"]["namespace"]
        avg_cpu_cores = float(result["value"][1])
        monthly_cost = avg_cpu_cores * 24 * 30 * CPU_CORE_HOUR_COST

        if namespace not in costs:
            costs[namespace] = {"cpu": 0, "memory": 0, "storage": 0}
        costs[namespace]["cpu"] = monthly_cost

    # Calculate memory costs
    for result in memory_results:
        namespace = result["metric"]["namespace"]
        avg_memory_bytes = float(result["value"][1])
        avg_memory_gb = avg_memory_bytes / (1024 ** 3)
        monthly_cost = avg_memory_gb * 24 * 30 * MEMORY_GB_HOUR_COST

        if namespace not in costs:
            costs[namespace] = {"cpu": 0, "memory": 0, "storage": 0}
        costs[namespace]["memory"] = monthly_cost

    # Calculate storage costs
    for result in storage_results:
        namespace = result["metric"]["namespace"]
        avg_storage_bytes = float(result["value"][1])
        avg_storage_gb = avg_storage_bytes / (1024 ** 3)
        monthly_cost = avg_storage_gb * STORAGE_GB_MONTH_COST

        if namespace not in costs:
            costs[namespace] = {"cpu": 0, "memory": 0, "storage": 0}
        costs[namespace]["storage"] = monthly_cost

    # Calculate totals
    for namespace in costs:
        costs[namespace]["total"] = (
            costs[namespace]["cpu"] +
            costs[namespace]["memory"] +
            costs[namespace]["storage"]
        )

    return costs

def generate_cost_report():
    """Generate and export cost report"""
    costs = calculate_namespace_costs()

    # Sort by total cost
    sorted_costs = sorted(
        costs.items(),
        key=lambda x: x[1]["total"],
        reverse=True
    )

    report = {
        "generated_at": datetime.now().isoformat(),
        "period": "30 days",
        "namespaces": []
    }

    total_cluster_cost = 0

    for namespace, cost_breakdown in sorted_costs:
        namespace_data = {
            "namespace": namespace,
            "cpu_cost": f"${cost_breakdown['cpu']:.2f}",
            "memory_cost": f"${cost_breakdown['memory']:.2f}",
            "storage_cost": f"${cost_breakdown['storage']:.2f}",
            "total_cost": f"${cost_breakdown['total']:.2f}"
        }
        report["namespaces"].append(namespace_data)
        total_cluster_cost += cost_breakdown["total"]

    report["total_cluster_cost"] = f"${total_cluster_cost:.2f}"

    # Export to JSON
    with open("/reports/namespace-costs.json", "w") as f:
        json.dump(report, f, indent=2)

    # Print summary
    print(f"Total Cluster Cost: ${total_cluster_cost:.2f}")
    print("\nTop 5 Most Expensive Namespaces:")
    for i, (namespace, costs) in enumerate(sorted_costs[:5], 1):
        print(f"{i}. {namespace}: ${costs['total']:.2f}")

if __name__ == "__main__":
    generate_cost_report()
```

Deploy this as a CronJob to generate monthly cost reports:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: namespace-cost-report
  namespace: monitoring
spec:
  schedule: "0 0 1 * *"  # First day of each month
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: prometheus-reader
          containers:
          - name: cost-calculator
            image: cost-calculator:latest
            volumeMounts:
            - name: reports
              mountPath: /reports
          volumes:
          - name: reports
            persistentVolumeClaim:
              claimName: cost-reports
          restartPolicy: OnFailure
```

## Setting Up Usage Alerts

Alert teams when they approach quota limits:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-quota-alerts
  namespace: monitoring
spec:
  groups:
  - name: namespace-quotas
    rules:
    - alert: NamespaceNearCPUQuota
      expr: |
        (kube_resourcequota{resource="requests.cpu",type="used"}
        /
        kube_resourcequota{resource="requests.cpu",type="hard"}) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Namespace {{ $labels.namespace }} using {{ $value | humanizePercentage }} of CPU quota"

    - alert: NamespaceNearMemoryQuota
      expr: |
        (kube_resourcequota{resource="requests.memory",type="used"}
        /
        kube_resourcequota{resource="requests.memory",type="hard"}) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Namespace {{ $labels.namespace }} using {{ $value | humanizePercentage }} of memory quota"

    - alert: NamespaceResourceGrowth
      expr: |
        (
          avg_over_time(namespace:cpu_requests:sum[7d])
          /
          avg_over_time(namespace:cpu_requests:sum[7d] offset 7d)
        ) > 1.5
      labels:
        severity: info
      annotations:
        summary: "Namespace {{ $labels.namespace }} resource usage grew 50% week-over-week"
```

## Tracking Network and Storage I/O

Beyond CPU and memory, track network and storage I/O:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-io-rules
  namespace: monitoring
data:
  io-tracking.rules: |
    groups:
    - name: namespace-io
      rules:
      # Network receive bytes by namespace
      - record: namespace:network_receive_bytes:rate
        expr: |
          sum(rate(container_network_receive_bytes_total[5m])) by (namespace)

      # Network transmit bytes by namespace
      - record: namespace:network_transmit_bytes:rate
        expr: |
          sum(rate(container_network_transmit_bytes_total[5m])) by (namespace)

      # Disk read bytes by namespace
      - record: namespace:disk_read_bytes:rate
        expr: |
          sum(rate(container_fs_reads_bytes_total[5m])) by (namespace)

      # Disk write bytes by namespace
      - record: namespace:disk_write_bytes:rate
        expr: |
          sum(rate(container_fs_writes_bytes_total[5m])) by (namespace)
```

## Implementing Resource Labels for Detailed Tracking

Add labels to workloads for fine-grained tracking:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  labels:
    app: web-app
    team: platform
    cost-center: engineering
    environment: production
    project: user-portal
spec:
  template:
    metadata:
      labels:
        app: web-app
        team: platform
        cost-center: engineering
        environment: production
        project: user-portal
    spec:
      containers:
      - name: web
        image: web-app:latest
```

Query costs by label dimensions:

```promql
# CPU usage by team
sum(rate(container_cpu_usage_seconds_total[5m])) by (label_team)

# Memory usage by cost center
sum(container_memory_working_set_bytes) by (label_cost_center)

# Resource requests by project
sum(kube_pod_container_resource_requests) by (label_project, resource)
```

## Exporting Data for BI Tools

Export namespace resource data to external analytics platforms:

```python
#!/usr/bin/env python3
import pandas as pd
import requests
from datetime import datetime

def export_namespace_data():
    """Export namespace resource data to CSV for BI tools"""

    metrics = {
        "cpu_requests": "namespace:cpu_requests:sum",
        "memory_requests": "namespace:memory_requests:sum / 1024 / 1024 / 1024",
        "cpu_usage": "namespace:cpu_usage:sum",
        "memory_usage": "namespace:memory_usage:sum / 1024 / 1024 / 1024",
        "pod_count": "namespace:pod_count:sum"
    }

    data = []

    for metric_name, query in metrics.items():
        response = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query}
        )
        results = response.json()["data"]["result"]

        for result in results:
            namespace = result["metric"]["namespace"]
            value = float(result["value"][1])

            data.append({
                "timestamp": datetime.now(),
                "namespace": namespace,
                "metric": metric_name,
                "value": value
            })

    df = pd.DataFrame(data)
    df.to_csv("/exports/namespace-resources.csv", index=False)
    print(f"Exported {len(data)} data points")

if __name__ == "__main__":
    export_namespace_data()
```

## Conclusion

Namespace resource tracking provides essential visibility into cluster consumption patterns. By implementing resource quotas, comprehensive metrics collection, cost allocation, and detailed reporting, you gain the insights needed for chargeback, capacity planning, and optimization. The combination of real-time monitoring, historical analysis, and automated reporting creates a complete resource tracking system that helps teams understand and optimize their cloud spending.
