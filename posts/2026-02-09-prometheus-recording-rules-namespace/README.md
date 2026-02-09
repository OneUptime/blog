# How to Create Prometheus Recording Rules for Kubernetes Namespace-Level Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Recording Rules, Observability, Performance

Description: Learn how to create Prometheus recording rules that pre-compute namespace-level metric aggregations to improve query performance and reduce dashboard load times.

---

Recording rules pre-compute expensive aggregations and store the results as new time series. For Kubernetes metrics with thousands of pods, namespace-level aggregations can take seconds to compute. Recording rules cache these calculations, making dashboards and alerts much faster.

This guide covers creating effective recording rules for common namespace-level aggregations like CPU usage, memory consumption, and network throughput.

## Why Namespace Aggregations Need Recording Rules

Kubernetes metrics are collected per container and pod, creating high-cardinality data. Aggregating thousands of time series at query time creates several problems:

1. Dashboard panels take 5-10 seconds to load
2. Multiple users querying simultaneously overload Prometheus
3. Complex queries timeout on large clusters
4. Alert evaluation becomes slow and unreliable

Recording rules solve this by pre-computing aggregations at regular intervals (typically every 30 seconds) and storing compact results.

## Basic Recording Rule Structure

Recording rules are defined in Prometheus configuration using the PrometheusRule CRD when running Prometheus Operator.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-aggregations
  namespace: monitoring
spec:
  groups:
  - name: namespace_metrics
    interval: 30s
    rules:
    - record: namespace:container_cpu_usage:sum
      expr: |
        sum by (namespace) (
          rate(container_cpu_usage_seconds_total{container!=""}[5m])
        )
```

The rule evaluates every 30 seconds and stores results as the metric `namespace:container_cpu_usage:sum`. The naming convention follows Prometheus guidelines: aggregation level, metric name, operation.

## CPU Usage Aggregation Rules

Create rules for total CPU usage and utilization percentage at the namespace level.

```yaml
groups:
- name: namespace_cpu
  interval: 30s
  rules:
  # Total CPU cores used per namespace
  - record: namespace:container_cpu_usage_seconds:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m])
      )

  # CPU requests per namespace
  - record: namespace:kube_pod_container_resource_requests_cpu_cores:sum
    expr: |
      sum by (namespace) (
        kube_pod_container_resource_requests{resource="cpu"}
      )

  # CPU limits per namespace
  - record: namespace:kube_pod_container_resource_limits_cpu_cores:sum
    expr: |
      sum by (namespace) (
        kube_pod_container_resource_limits{resource="cpu"}
      )

  # CPU utilization vs requests (percentage)
  - record: namespace:container_cpu_usage:ratio_requests
    expr: |
      namespace:container_cpu_usage_seconds:sum_rate
      /
      namespace:kube_pod_container_resource_requests_cpu_cores:sum

  # CPU utilization vs limits (percentage)
  - record: namespace:container_cpu_usage:ratio_limits
    expr: |
      namespace:container_cpu_usage_seconds:sum_rate
      /
      namespace:kube_pod_container_resource_limits_cpu_cores:sum
```

These rules create a complete CPU usage hierarchy. The ratio rules build on the base aggregations, demonstrating how recording rules can reference each other.

## Memory Usage Aggregation Rules

Memory aggregations follow the same pattern but use working set memory, which reflects actual usage minus cache.

```yaml
groups:
- name: namespace_memory
  interval: 30s
  rules:
  # Total memory working set per namespace (in bytes)
  - record: namespace:container_memory_working_set_bytes:sum
    expr: |
      sum by (namespace) (
        container_memory_working_set_bytes{container!="",container!="POD"}
      )

  # Memory requests per namespace
  - record: namespace:kube_pod_container_resource_requests_memory_bytes:sum
    expr: |
      sum by (namespace) (
        kube_pod_container_resource_requests{resource="memory"}
      )

  # Memory limits per namespace
  - record: namespace:kube_pod_container_resource_limits_memory_bytes:sum
    expr: |
      sum by (namespace) (
        kube_pod_container_resource_limits{resource="memory"}
      )

  # Memory utilization vs requests
  - record: namespace:container_memory_working_set:ratio_requests
    expr: |
      namespace:container_memory_working_set_bytes:sum
      /
      namespace:kube_pod_container_resource_requests_memory_bytes:sum

  # Memory utilization vs limits
  - record: namespace:container_memory_working_set:ratio_limits
    expr: |
      namespace:container_memory_working_set_bytes:sum
      /
      namespace:kube_pod_container_resource_limits_memory_bytes:sum
```

The working set metric is more accurate than RSS for Kubernetes because it reflects what the OOM killer considers.

## Network Throughput Aggregation Rules

Network metrics benefit significantly from recording rules due to the interface label cardinality.

```yaml
groups:
- name: namespace_network
  interval: 30s
  rules:
  # Bytes received per second per namespace
  - record: namespace:container_network_receive_bytes:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_network_receive_bytes_total{container!="",container!="POD"}[5m])
      )

  # Bytes transmitted per second per namespace
  - record: namespace:container_network_transmit_bytes:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_network_transmit_bytes_total{container!="",container!="POD"}[5m])
      )

  # Total bidirectional network throughput
  - record: namespace:container_network_total_bytes:sum_rate
    expr: |
      namespace:container_network_receive_bytes:sum_rate
      +
      namespace:container_network_transmit_bytes:sum_rate

  # Packets received per second
  - record: namespace:container_network_receive_packets:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_network_receive_packets_total{container!="",container!="POD"}[5m])
      )

  # Packets transmitted per second
  - record: namespace:container_network_transmit_packets:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_network_transmit_packets_total{container!="",container!="POD"}[5m])
      )
```

These rules reduce network metric queries from thousands of time series to one per namespace.

## Filesystem Usage Aggregation Rules

Disk usage aggregations help track persistent volume consumption.

```yaml
groups:
- name: namespace_filesystem
  interval: 30s
  rules:
  # Total filesystem bytes used per namespace
  - record: namespace:container_fs_usage_bytes:sum
    expr: |
      sum by (namespace) (
        container_fs_usage_bytes{container!="",container!="POD"}
      )

  # Total filesystem capacity per namespace
  - record: namespace:container_fs_limit_bytes:sum
    expr: |
      sum by (namespace) (
        container_fs_limit_bytes{container!="",container!="POD"}
      )

  # Filesystem utilization percentage
  - record: namespace:container_fs_usage:ratio
    expr: |
      namespace:container_fs_usage_bytes:sum
      /
      namespace:container_fs_limit_bytes:sum
```

## Pod Count Aggregation Rules

Track running pods and pod states per namespace.

```yaml
groups:
- name: namespace_pods
  interval: 30s
  rules:
  # Total running pods per namespace
  - record: namespace:kube_pod_status_phase:count
    expr: |
      count by (namespace, phase) (
        kube_pod_status_phase
      )

  # Total pods per namespace (all phases)
  - record: namespace:kube_pod_info:count
    expr: |
      count by (namespace) (
        kube_pod_info
      )

  # Container restart count per namespace
  - record: namespace:kube_pod_container_status_restarts:sum
    expr: |
      sum by (namespace) (
        kube_pod_container_status_restarts_total
      )

  # Pods waiting to be scheduled
  - record: namespace:kube_pod_status_scheduled_false:count
    expr: |
      count by (namespace) (
        kube_pod_status_scheduled{condition="false"}
      )
```

## Creating Multi-Level Aggregations

Some scenarios need both namespace and workload-level aggregations.

```yaml
groups:
- name: namespace_workload_cpu
  interval: 30s
  rules:
  # CPU by namespace and workload type
  - record: namespace_workload:container_cpu_usage_seconds:sum_rate
    expr: |
      sum by (namespace, workload, workload_type) (
        label_replace(
          label_replace(
            rate(container_cpu_usage_seconds_total{container!=""}[5m]),
            "workload", "$1", "pod", "^(.*)-[^-]+-[^-]+$"
          ),
          "workload_type", "deployment", "workload", ".*"
        )
      )

  # Then aggregate to namespace level
  - record: namespace:container_cpu_usage_seconds:sum_rate
    expr: |
      sum by (namespace) (
        namespace_workload:container_cpu_usage_seconds:sum_rate
      )
```

This creates both granular (namespace + workload) and summarized (namespace only) views from a single source query.

## Optimizing Recording Rule Performance

Recording rules themselves consume resources. Optimize them with these techniques:

1. **Appropriate intervals**: Use 30s for frequently-accessed metrics, 1m or 5m for others
2. **Avoid over-aggregation**: Only create rules that are actually used
3. **Chain rules**: Build complex aggregations from simpler ones
4. **Filter early**: Exclude unnecessary containers with label matchers

Example of efficient chaining:

```yaml
# Base rule with filtering
- record: namespace:container_cpu_base:sum_rate
  expr: |
    sum by (namespace) (
      rate(container_cpu_usage_seconds_total{
        container!="",
        container!="POD",
        namespace!~"kube-.*|default"
      }[5m])
    )

# Derived rule references the base
- record: namespace:container_cpu_usage:percentage
  expr: |
    namespace:container_cpu_base:sum_rate * 100
```

## Using Recording Rules in Dashboards

Reference recording rules in Grafana dashboards to improve load times dramatically.

Before (slow):
```promql
sum by (namespace) (
  rate(container_cpu_usage_seconds_total{container!=""}[5m])
)
```

After (fast):
```promql
namespace:container_cpu_usage_seconds:sum_rate
```

The recording rule query returns results in milliseconds instead of seconds.

## Alerting on Recording Rules

Create alerts using recording rules for consistent thresholds and fast evaluation.

```yaml
groups:
- name: namespace_alerts
  rules:
  - alert: NamespaceHighCPUUsage
    expr: |
      namespace:container_cpu_usage:ratio_requests > 0.9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Namespace {{ $labels.namespace }} high CPU usage"
      description: "Using {{ $value | humanizePercentage }} of CPU requests"

  - alert: NamespaceHighMemoryUsage
    expr: |
      namespace:container_memory_working_set:ratio_limits > 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Namespace {{ $labels.namespace }} high memory usage"
      description: "Using {{ $value | humanizePercentage }} of memory limits"
```

## Verifying Recording Rules

Check that recording rules are working correctly:

```bash
# Query the recorded metric
curl -s 'http://prometheus:9090/api/v1/query?query=namespace:container_cpu_usage_seconds:sum_rate' | jq

# Compare to the original query to verify accuracy
curl -s 'http://prometheus:9090/api/v1/query?query=sum+by+(namespace)+(rate(container_cpu_usage_seconds_total[5m]))' | jq
```

The results should match within rounding differences.

## Maintaining Recording Rules

As your cluster evolves, review recording rules quarterly to:

1. Remove unused rules that waste storage
2. Add new rules for emerging query patterns
3. Adjust intervals based on actual query frequency
4. Update label matchers for new workload types

Recording rules transform slow namespace queries into instant results, making Kubernetes monitoring dashboards responsive and reliable even at scale.
