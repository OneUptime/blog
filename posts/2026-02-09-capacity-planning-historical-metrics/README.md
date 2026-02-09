# How to Perform Capacity Planning for Kubernetes Clusters Using Historical Resource Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, Operations

Description: Learn how to perform effective capacity planning for Kubernetes clusters by analyzing historical resource metrics with practical examples and forecasting techniques.

---

Running out of cluster capacity causes pod scheduling failures and service degradation. Over-provisioning wastes money on unused resources. Effective capacity planning balances cost and reliability by predicting future needs based on historical usage patterns.

## Understanding Capacity Planning

Capacity planning predicts when your cluster will run out of resources and how much capacity to add. It considers CPU, memory, storage, and network capacity across nodes. Good capacity planning prevents emergency scaling while avoiding unnecessary spending.

Planning requires analyzing usage trends, understanding growth patterns, and forecasting future demand. Historical metrics provide the foundation for accurate predictions.

## Collecting Historical Metrics

Prometheus stores historical resource metrics for capacity analysis.

```yaml
# Prometheus configuration for long-term storage
global:
  scrape_interval: 30s
  evaluation_interval: 30s

# Remote write to long-term storage
remote_write:
  - url: "https://prometheus-long-term-storage/api/v1/write"
    queue_config:
      capacity: 10000
      max_shards: 50

# Important metrics for capacity planning
scrape_configs:
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
```

Retain metrics for at least 90 days, preferably 1 year, for meaningful trend analysis.

## Analyzing Node Resource Usage

Query historical node resource usage to understand capacity trends.

```yaml
# CPU usage trends
node_cpu_usage_percent = |
  (
    1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))
  ) * 100

# Memory usage trends
node_memory_usage_percent = |
  (
    1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
  ) * 100

# Storage usage
node_disk_usage_percent = |
  (
    1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)
  ) * 100
```

These queries show current utilization as percentages.

## Identifying Growth Trends

Calculate resource growth rates over time to forecast future needs.

```yaml
# CPU growth rate (% increase per month)
cpu_growth_rate = |
  (
    avg(node_cpu_usage_percent)
    -
    avg(node_cpu_usage_percent offset 30d)
  ) / avg(node_cpu_usage_percent offset 30d) * 100

# Memory growth rate
memory_growth_rate = |
  (
    avg(node_memory_usage_percent)
    -
    avg(node_memory_usage_percent offset 30d)
  ) / avg(node_memory_usage_percent offset 30d) * 100

# Pod count growth
pod_count_growth = |
  (
    sum(kube_pod_info)
    -
    sum(kube_pod_info offset 30d)
  ) / sum(kube_pod_info offset 30d) * 100
```

Positive growth rates indicate increasing resource demand.

## Forecasting Future Capacity Needs

Use linear regression on historical data to forecast future requirements.

```python
#!/usr/bin/env python3
import requests
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

def fetch_prometheus_data(query, days=90):
    """Fetch historical data from Prometheus"""
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)

    params = {
        'query': query,
        'start': start_time.timestamp(),
        'end': end_time.timestamp(),
        'step': '1h'
    }

    response = requests.get(
        'http://prometheus:9090/api/v1/query_range',
        params=params
    )
    return response.json()['data']['result']

def forecast_capacity(metric_name, query, forecast_days=30):
    """Forecast resource usage"""
    # Fetch historical data
    data = fetch_prometheus_data(query)

    if not data or not data[0]['values']:
        print(f"No data available for {metric_name}")
        return

    # Extract timestamps and values
    timestamps = [float(v[0]) for v in data[0]['values']]
    values = [float(v[1]) for v in data[0]['values']]

    # Prepare data for regression
    X = np.array(timestamps).reshape(-1, 1)
    y = np.array(values)

    # Fit linear regression model
    model = LinearRegression()
    model.fit(X, y)

    # Generate forecast
    future_timestamps = np.linspace(
        timestamps[-1],
        timestamps[-1] + (86400 * forecast_days),
        forecast_days
    ).reshape(-1, 1)

    forecast = model.predict(future_timestamps)

    # Plot results
    plt.figure(figsize=(12, 6))
    plt.plot(timestamps, values, label='Historical', linewidth=2)
    plt.plot(future_timestamps, forecast, label='Forecast', linestyle='--', linewidth=2)
    plt.axhline(y=80, color='yellow', linestyle='--', label='Warning Threshold')
    plt.axhline(y=90, color='red', linestyle='--', label='Critical Threshold')

    plt.xlabel('Time')
    plt.ylabel(f'{metric_name} (%)')
    plt.title(f'{metric_name} Capacity Forecast')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{metric_name}_forecast.png')

    # Calculate when threshold will be reached
    threshold_time = None
    for i, val in enumerate(forecast):
        if val > 85:
            threshold_time = future_timestamps[i][0]
            break

    if threshold_time:
        days_until_threshold = (threshold_time - timestamps[-1]) / 86400
        print(f"{metric_name}: Threshold reached in {days_until_threshold:.1f} days")
    else:
        print(f"{metric_name}: Threshold not reached in forecast period")

    return forecast, future_timestamps

# Run forecasts
forecast_capacity('CPU Usage', 'avg(node_cpu_usage_percent)')
forecast_capacity('Memory Usage', 'avg(node_memory_usage_percent)')
forecast_capacity('Pod Count', 'sum(kube_pod_info)')
```

This script forecasts when resources will reach capacity.

## Calculating Required Capacity

Determine how many nodes to add based on forecasts.

```python
def calculate_node_requirements(current_pods, growth_rate_monthly, months=6):
    """Calculate required node capacity"""
    # Project pod count
    projected_pods = current_pods * ((1 + growth_rate_monthly) ** months)

    # Average pods per node (with headroom)
    pods_per_node = 100  # Kubernetes default max
    effective_pods_per_node = pods_per_node * 0.8  # 80% utilization target

    # Calculate required nodes
    required_nodes = np.ceil(projected_pods / effective_pods_per_node)
    current_nodes = np.ceil(current_pods / effective_pods_per_node)

    additional_nodes = required_nodes - current_nodes

    print(f"Current pods: {current_pods}")
    print(f"Projected pods (6 months): {projected_pods:.0f}")
    print(f"Current nodes needed: {current_nodes:.0f}")
    print(f"Future nodes needed: {required_nodes:.0f}")
    print(f"Additional nodes required: {additional_nodes:.0f}")

    return additional_nodes

# Example usage
calculate_node_requirements(
    current_pods=500,
    growth_rate_monthly=0.05,  # 5% monthly growth
    months=6
)
```

This calculates node requirements accounting for growth and utilization targets.

## Seasonal Patterns

Many workloads have seasonal patterns that affect capacity planning.

```yaml
# Prometheus query for weekly patterns
weekly_cpu_pattern = |
  avg_over_time(
    avg(node_cpu_usage_percent)[1w:1h]
  ) by (hour, weekday)

# Monthly patterns
monthly_pattern = |
  avg_over_time(
    avg(node_cpu_usage_percent)[30d:1d]
  ) by (day)
```

Account for seasonal peaks when planning capacity additions.

## Workload-Specific Analysis

Analyze capacity needs per namespace or application.

```yaml
# CPU usage by namespace
namespace_cpu_usage = |
  sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)

# Memory usage by namespace
namespace_memory_usage = |
  sum(container_memory_working_set_bytes) by (namespace)

# Identify top consumers
top_cpu_consumers = |
  topk(10,
    sum(rate(container_cpu_usage_seconds_total[1h])) by (namespace, pod)
  )
```

Understanding which workloads drive growth helps target capacity additions.

## Resource Waste Analysis

Identify over-provisioned resources to reclaim capacity.

```yaml
# Pods with excessive resource requests
overprovisioned_pods = |
  (
    kube_pod_container_resource_requests{resource="cpu"}
    -
    rate(container_cpu_usage_seconds_total[1h])
  ) / kube_pod_container_resource_requests{resource="cpu"} * 100
  > 50

# Unused persistent volumes
unused_pvs = |
  kube_persistentvolume_info
  unless
  on(persistentvolume) kube_persistentvolumeclaim_info
```

Rightsizing and cleanup can defer capacity additions.

## Cost Modeling

Calculate the cost impact of capacity changes.

```python
def calculate_capacity_cost(nodes_to_add, instance_type='m5.xlarge'):
    """Calculate monthly cost of capacity addition"""
    # AWS pricing example (adjust for your provider)
    instance_costs = {
        'm5.xlarge': 0.192,   # $/hour
        'm5.2xlarge': 0.384,
        'm5.4xlarge': 0.768,
    }

    hourly_cost = instance_costs.get(instance_type, 0.192)
    monthly_cost = hourly_cost * 730 * nodes_to_add  # 730 hours/month

    print(f"Instance type: {instance_type}")
    print(f"Nodes to add: {nodes_to_add}")
    print(f"Hourly cost per node: ${hourly_cost}")
    print(f"Monthly cost: ${monthly_cost:.2f}")
    print(f"Annual cost: ${monthly_cost * 12:.2f}")

    return monthly_cost

# Calculate cost of capacity expansion
calculate_capacity_cost(nodes_to_add=5, instance_type='m5.2xlarge')
```

Cost modeling helps justify capacity investments.

## Automated Capacity Reports

Generate regular capacity reports for stakeholders.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: capacity-report
  namespace: monitoring
spec:
  schedule: "0 8 * * 1"  # Every Monday at 8am
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reporter
            image: capacity-reporter:1.0
            env:
            - name: PROMETHEUS_URL
              value: "http://prometheus:9090"
            - name: REPORT_RECIPIENTS
              value: "ops-team@example.com,finance@example.com"
            command:
            - python
            - /app/generate-report.py
          restartPolicy: OnFailure
```

Automated reports keep teams informed of capacity trends.

## Capacity Alerts

Alert when capacity thresholds are approaching.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: capacity-alerts
  namespace: monitoring
data:
  capacity-rules.yml: |
    groups:
    - name: capacity_planning
      interval: 5m
      rules:
        - alert: NodeCPUCapacityWarning
          expr: |
            predict_linear(
              avg(node_cpu_usage_percent)[7d],
              30 * 86400
            ) > 80
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "CPU capacity will reach 80% in 30 days"
            description: "Current trend indicates capacity shortage"

        - alert: NodeMemoryCapacityWarning
          expr: |
            predict_linear(
              avg(node_memory_usage_percent)[7d],
              30 * 86400
            ) > 80
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Memory capacity will reach 80% in 30 days"

        - alert: PodCapacityWarning
          expr: |
            predict_linear(
              sum(kube_pod_info)[7d],
              30 * 86400
            ) > (sum(kube_node_status_capacity{resource="pods"}) * 0.8)
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Pod capacity will be exhausted in 30 days"
```

Proactive alerts prevent emergency capacity additions.

## Best Practices

Analyze at least 90 days of historical data for reliable trends. Shorter periods miss seasonal patterns and anomalies.

Account for business growth projections beyond historical trends. Launches and marketing campaigns cause non-linear growth.

Plan for 20-30% headroom beyond projected capacity. Unexpected events shouldn't immediately exhaust resources.

Review capacity plans quarterly. Business priorities and growth rates change over time.

Correlate resource usage with business metrics. Revenue, active users, and transactions per day provide context.

Test capacity additions in staging before production. Verify that scaling works as expected.

## Conclusion

Effective capacity planning prevents outages while controlling costs. Analyze historical resource metrics to identify trends, forecast future needs using regression models, and plan capacity additions before resources are exhausted. Account for seasonal patterns and workload-specific growth. Set up automated reporting and alerting to catch capacity issues early. With data-driven capacity planning, teams maintain reliable services without over-provisioning resources.
