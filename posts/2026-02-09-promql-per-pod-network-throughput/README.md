# How to Write PromQL Queries That Calculate Per-Pod Network Throughput in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PromQL, Kubernetes, Networking, Prometheus, Observability

Description: Master PromQL queries for calculating network throughput metrics per pod in Kubernetes clusters, including rate calculations, aggregations, and bandwidth analysis.

---

Network throughput metrics reveal application performance bottlenecks, bandwidth constraints, and traffic patterns. Calculating accurate per-pod throughput requires understanding rate functions, counter semantics, and label aggregation in PromQL.

This guide covers practical PromQL patterns for analyzing network traffic at the pod level using Kubernetes metrics from cAdvisor and kube-state-metrics.

## Understanding Network Counter Metrics

Kubernetes exposes container network metrics through cAdvisor, which collects cumulative byte and packet counters for each pod.

The primary metrics are:

- `container_network_receive_bytes_total` - Total bytes received
- `container_network_transmit_bytes_total` - Total bytes transmitted
- `container_network_receive_packets_total` - Total packets received
- `container_network_transmit_packets_total` - Total packets transmitted

These are counter metrics that always increase. To calculate throughput (bytes per second), you need to compute the rate of change over time.

## Calculating Basic Receive Throughput

The simplest throughput query calculates bytes received per second for a specific pod.

```promql
# Bytes per second received by pod
rate(container_network_receive_bytes_total{pod="my-app-7d8f9b5c-xk2m9"}[5m])
```

The `rate()` function calculates the per-second average rate over the specified time window (5 minutes here). It handles counter resets automatically, which occur during pod restarts.

For human-readable output, convert to megabytes per second:

```promql
# MB/s received by pod
rate(container_network_receive_bytes_total{pod="my-app-7d8f9b5c-xk2m9"}[5m]) / 1024 / 1024
```

This divides bytes by 1024 twice to convert to megabytes.

## Calculating Transmit Throughput

Transmit throughput follows the same pattern using the transmit metric.

```promql
# Bytes per second transmitted by pod
rate(container_network_transmit_bytes_total{pod="my-app-7d8f9b5c-xk2m9"}[5m])
```

To get total bidirectional throughput, sum both directions:

```promql
# Total bidirectional throughput in MB/s
(
  rate(container_network_receive_bytes_total{pod="my-app-7d8f9b5c-xk2m9"}[5m]) +
  rate(container_network_transmit_bytes_total{pod="my-app-7d8f9b5c-xk2m9"}[5m])
) / 1024 / 1024
```

This gives you the total network bandwidth consumed by the pod.

## Aggregating by Deployment or Namespace

Most applications run multiple pod replicas. Aggregate throughput across all pods in a deployment using label matchers and sum.

```promql
# Total receive throughput for all pods in deployment
sum(
  rate(container_network_receive_bytes_total{
    namespace="production",
    pod=~"my-app-.*"
  }[5m])
) / 1024 / 1024
```

The regex matcher `pod=~"my-app-.*"` selects all pods with names starting with "my-app". The sum aggregation adds throughput across all matching pods.

For namespace-level aggregation:

```promql
# Total namespace throughput (receive + transmit)
sum by (namespace) (
  rate(container_network_receive_bytes_total[5m]) +
  rate(container_network_transmit_bytes_total[5m])
) / 1024 / 1024
```

The `sum by (namespace)` clause groups results by namespace, showing throughput for each.

## Per-Pod Throughput with Labels

To see throughput for each individual pod while maintaining label information:

```promql
# Per-pod receive throughput with pod name
sum by (namespace, pod) (
  rate(container_network_receive_bytes_total[5m])
) / 1024 / 1024
```

This returns a separate time series for each pod, labeled with namespace and pod name. Useful for identifying which pods consume the most bandwidth.

## Calculating Top N Bandwidth Consumers

Find the pods with the highest network usage using topk:

```promql
# Top 10 pods by receive bandwidth
topk(10,
  sum by (namespace, pod) (
    rate(container_network_receive_bytes_total[5m])
  ) / 1024 / 1024
)
```

The `topk()` function returns the top N time series by value. This query identifies bandwidth hotspots.

For bottom performers (lowest throughput):

```promql
# Bottom 10 pods by receive bandwidth
bottomk(10,
  sum by (namespace, pod) (
    rate(container_network_receive_bytes_total[5m])
  ) / 1024 / 1024
)
```

## Handling Network Interfaces

Container metrics include an interface label (usually eth0). When pods have multiple interfaces, aggregate carefully:

```promql
# Total throughput across all interfaces per pod
sum by (namespace, pod) (
  rate(container_network_receive_bytes_total[5m]) +
  rate(container_network_transmit_bytes_total[5m])
) / 1024 / 1024
```

The sum aggregation combines metrics from all interfaces for each pod.

To see per-interface breakdown:

```promql
# Throughput per interface per pod
sum by (namespace, pod, interface) (
  rate(container_network_receive_bytes_total[5m])
) / 1024 / 1024
```

## Calculating Packet Rate

Throughput in packets per second reveals different patterns than bytes per second, especially for small-packet workloads.

```promql
# Packets per second received
rate(container_network_receive_packets_total{pod="my-app-7d8f9b5c-xk2m9"}[5m])
```

Average packet size helps identify traffic patterns:

```promql
# Average packet size in bytes
rate(container_network_receive_bytes_total{pod="my-app-7d8f9b5c-xk2m9"}[5m]) /
rate(container_network_receive_packets_total{pod="my-app-7d8f9b5c-xk2m9"}[5m])
```

Small average packet sizes indicate many small requests, while large sizes suggest bulk data transfer.

## Bandwidth Utilization Percentage

If you know the network interface capacity, calculate utilization as a percentage.

```promql
# Bandwidth utilization assuming 1 Gbps interface
(
  sum by (pod) (
    rate(container_network_receive_bytes_total[5m]) +
    rate(container_network_transmit_bytes_total[5m])
  ) * 8 / (1000 * 1000 * 1000)
) * 100
```

Multiply bytes by 8 to convert to bits, divide by interface capacity in bits per second, then multiply by 100 for percentage.

## Detecting Bandwidth Spikes

Identify pods with sudden bandwidth increases using the increase function:

```promql
# Bytes received in last 1 minute vs previous 5 minutes
(
  increase(container_network_receive_bytes_total[1m]) -
  increase(container_network_receive_bytes_total[5m] offset 1m) / 5
) / 1024 / 1024
```

This compares recent throughput to the average over a longer window, highlighting sudden spikes.

## Throughput by Service

If pods have service labels, aggregate by service:

```promql
# Throughput per service
sum by (service) (
  rate(container_network_receive_bytes_total[5m])
) / 1024 / 1024
```

Requires the service label to be present on metrics. Prometheus service discovery typically adds this.

## Creating Throughput Alerts

Define alerts for high bandwidth usage:

```yaml
groups:
- name: network
  rules:
  - alert: HighPodNetworkReceive
    expr: |
      sum by (namespace, pod) (
        rate(container_network_receive_bytes_total[5m])
      ) / 1024 / 1024 > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.pod }} high receive bandwidth"
      description: "Pod receiving {{ $value | humanize }}MB/s"
```

This alerts when any pod receives more than 100 MB/s for 5 minutes.

## Optimizing Query Performance

For better performance with high-cardinality pod metrics:

1. Use specific namespace filters to reduce series
2. Aggregate early in the query to drop unnecessary labels
3. Use recording rules for frequently-queried throughput metrics
4. Choose appropriate time windows (5m is standard, adjust based on traffic patterns)

Example recording rule:

```yaml
groups:
- name: network_throughput
  interval: 30s
  rules:
  - record: pod:network_receive_bytes:rate5m
    expr: |
      sum by (namespace, pod) (
        rate(container_network_receive_bytes_total[5m])
      )
  - record: pod:network_transmit_bytes:rate5m
    expr: |
      sum by (namespace, pod) (
        rate(container_network_transmit_bytes_total[5m])
      )
```

Then query the recording rule instead:

```promql
# Using pre-computed recording rule
pod:network_receive_bytes:rate5m{namespace="production"} / 1024 / 1024
```

## Handling Missing Metrics

Some pods may not have network metrics if they are very short-lived or failed during startup. Use `or vector(0)` to handle missing data:

```promql
# Throughput with zero default for missing pods
(
  sum by (pod) (
    rate(container_network_receive_bytes_total[5m])
  ) or vector(0)
) / 1024 / 1024
```

This ensures queries return zero instead of no data for pods without metrics.

## Combining with Resource Limits

Compare network usage to pod resource requests:

```promql
# Network throughput per CPU core
(
  sum by (namespace, pod) (
    rate(container_network_receive_bytes_total[5m])
  ) / 1024 / 1024
) /
(
  kube_pod_container_resource_requests{resource="cpu"}
)
```

This reveals which pods are network-intensive relative to their CPU allocation.

Accurate network throughput queries provide visibility into application communication patterns and help identify performance bottlenecks before they impact users.
