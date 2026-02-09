# How to Optimize Prometheus Recording Rules to Reduce Query Latency by 90 Percent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Performance, Recording Rules, Observability, Optimization

Description: Discover advanced techniques to optimize Prometheus recording rules and achieve up to 90 percent reduction in query latency through strategic rule design and caching.

---

Recording rules can either improve or degrade Prometheus performance depending on how you design them. Poorly structured rules create redundant work, while optimized rules cache expensive computations and dramatically reduce query latency.

This guide covers proven optimization techniques that reduce dashboard load times from 10+ seconds to under 1 second.

## Understanding Recording Rule Overhead

Recording rules consume resources in three ways:

1. **Evaluation time**: Computing the expression consumes CPU
2. **Storage overhead**: Recorded metrics occupy disk space and memory
3. **Series cardinality**: Each new metric increases the total series count

The goal is to maximize query speedup while minimizing these costs. A well-designed recording rule evaluates quickly and stores compact results that eliminate expensive query-time aggregations.

## Identifying Expensive Queries

Before creating recording rules, identify which queries actually need optimization. Use Prometheus query statistics to find slow queries.

```bash
# Find slowest queries in Prometheus logs
kubectl logs -n monitoring prometheus-0 | grep "query" | grep -E "took [0-9]+\.[0-9]+s" | sort -t= -k4 -n | tail -20
```

Focus on queries that:

- Take more than 1 second to execute
- Are executed frequently (dashboard panels, alerts)
- Aggregate across many series (high cardinality)
- Use complex PromQL functions (histogram_quantile, predict_linear)

## Optimizing Rule Evaluation Order

Recording rules can reference other recording rules, but evaluation order matters for performance.

Instead of evaluating the full expression multiple times:

```yaml
# Inefficient - evaluates base query 3 times
groups:
- name: inefficient
  interval: 30s
  rules:
  - record: cpu_usage_percentage
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!=""}[5m])
      ) * 100

  - record: high_cpu_namespaces
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!=""}[5m])
      ) > 5

  - record: cpu_usage_top10
    expr: |
      topk(10,
        sum by (namespace) (
          rate(container_cpu_usage_seconds_total{container!=""}[5m])
        )
      )
```

Compute the base aggregation once and reference it:

```yaml
# Efficient - evaluates base query once
groups:
- name: efficient
  interval: 30s
  rules:
  - record: namespace:container_cpu_usage_seconds:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!=""}[5m])
      )

  - record: namespace:container_cpu_usage_seconds:percentage
    expr: |
      namespace:container_cpu_usage_seconds:sum_rate * 100

  - record: namespace:container_cpu_usage_seconds:high
    expr: |
      namespace:container_cpu_usage_seconds:sum_rate > 5

  - record: namespace:container_cpu_usage_seconds:top10
    expr: |
      topk(10, namespace:container_cpu_usage_seconds:sum_rate)
```

This evaluates the expensive base query once, then applies lightweight transformations to the cached result.

## Choosing Optimal Aggregation Levels

Recording rules should aggregate at the level most commonly queried. Over-aggregation loses useful detail, while under-aggregation provides insufficient speedup.

For Kubernetes metrics, common aggregation levels are:

1. **Cluster-wide**: Single value for entire cluster
2. **Namespace**: One value per namespace
3. **Workload**: One value per deployment/statefulset
4. **Pod**: One value per pod (often too granular for recording rules)

Create a hierarchy of rules at different levels:

```yaml
groups:
- name: cpu_hierarchy
  interval: 30s
  rules:
  # Pod level - most granular
  - record: pod:container_cpu_usage_seconds:sum_rate
    expr: |
      sum by (namespace, pod) (
        rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m])
      )

  # Namespace level - aggregated from pod level
  - record: namespace:container_cpu_usage_seconds:sum_rate
    expr: |
      sum by (namespace) (
        pod:container_cpu_usage_seconds:sum_rate
      )

  # Cluster level - single value
  - record: cluster:container_cpu_usage_seconds:sum_rate
    expr: |
      sum(namespace:container_cpu_usage_seconds:sum_rate)
```

This hierarchy allows queries to use the appropriate aggregation level without re-computing base metrics.

## Reducing Cardinality with Label Dropping

High-cardinality labels like pod name and container ID bloat recorded metrics. Drop unnecessary labels early in the aggregation.

```yaml
# Before - keeps all labels (high cardinality)
- record: container_cpu_inefficient
  expr: |
    rate(container_cpu_usage_seconds_total[5m])

# After - drops unnecessary labels
- record: namespace_pod:container_cpu:sum_rate
  expr: |
    sum by (namespace, pod) (
      rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m])
    )
```

The second rule reduces cardinality by 10-100x by dropping container, image, and other high-cardinality labels.

## Using Appropriate Time Windows

The rate window (e.g., `[5m]`) affects both accuracy and performance. Longer windows smooth spikes but increase query time and lag.

For recording rules, balance responsiveness and stability:

```yaml
groups:
- name: multi_window_rates
  interval: 30s
  rules:
  # Short window for spike detection
  - record: namespace:container_cpu_usage:rate1m
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!=""}[1m])
      )

  # Medium window for general monitoring
  - record: namespace:container_cpu_usage:rate5m
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!=""}[5m])
      )

  # Long window for trend analysis
  - record: namespace:container_cpu_usage:rate30m
    expr: |
      sum by (namespace) (
        rate(container_cpu_usage_seconds_total{container!=""}[30m])
      )
```

Most queries use the 5m window, but having pre-computed alternatives for specific use cases improves performance for those queries.

## Pre-Computing Expensive Functions

Some PromQL functions are computationally expensive. Pre-compute them in recording rules for frequently-accessed results.

### Histogram Quantiles

Quantile calculations on histograms are slow. Pre-compute common percentiles:

```yaml
groups:
- name: request_latency_quantiles
  interval: 30s
  rules:
  - record: namespace:http_request_duration:p50
    expr: |
      histogram_quantile(0.50,
        sum by (namespace, le) (
          rate(http_request_duration_seconds_bucket[5m])
        )
      )

  - record: namespace:http_request_duration:p95
    expr: |
      histogram_quantile(0.95,
        sum by (namespace, le) (
          rate(http_request_duration_seconds_bucket[5m])
        )
      )

  - record: namespace:http_request_duration:p99
    expr: |
      histogram_quantile(0.99,
        sum by (namespace, le) (
          rate(http_request_duration_seconds_bucket[5m])
        )
      )
```

### Prediction and Trending

Prediction functions analyze historical data and are expensive:

```yaml
groups:
- name: capacity_predictions
  interval: 5m  # Less frequent evaluation for expensive predictions
  rules:
  - record: namespace:container_memory_working_set:predict_linear_4h
    expr: |
      predict_linear(
        namespace:container_memory_working_set_bytes:sum[1h],
        4 * 3600
      )
```

Run prediction rules less frequently (every 5m instead of 30s) since predictions don't need real-time updates.

## Filtering Data Early

Apply filters in the base recording rule to avoid processing irrelevant data:

```yaml
# Inefficient - processes all namespaces then filters
- record: production_cpu_usage
  expr: |
    namespace:container_cpu_usage_seconds:sum_rate{namespace=~"prod-.*"}

# Efficient - filters before aggregation
- record: production:container_cpu_usage_seconds:sum_rate
  expr: |
    sum by (namespace) (
      rate(container_cpu_usage_seconds_total{
        container!="",
        container!="POD",
        namespace=~"prod-.*"
      }[5m])
    )
```

Filtering at the source reduces the number of time series processed by subsequent aggregations.

## Optimizing Rule Group Intervals

Different recording rules need different evaluation frequencies. Group rules by update frequency:

```yaml
# High-frequency group for real-time metrics
- name: realtime_metrics
  interval: 10s
  rules:
  - record: instance:node_cpu:rate10s
    expr: rate(node_cpu_seconds_total[1m])

# Standard frequency for most metrics
- name: standard_metrics
  interval: 30s
  rules:
  - record: namespace:container_cpu_usage:rate5m
    expr: sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))

# Low-frequency group for trend analysis
- name: trend_metrics
  interval: 5m
  rules:
  - record: namespace:container_memory:predict_linear_4h
    expr: predict_linear(namespace:container_memory_working_set_bytes:sum[1h], 4*3600)
```

Evaluating expensive rules less frequently reduces Prometheus CPU usage while maintaining sufficient data granularity.

## Caching Ratio Calculations

Ratio calculations appear simple but can be expensive when computed across many series. Pre-compute common ratios:

```yaml
groups:
- name: utilization_ratios
  interval: 30s
  rules:
  # CPU utilization vs requests
  - record: namespace:container_cpu_usage:ratio_requests
    expr: |
      namespace:container_cpu_usage_seconds:sum_rate
      /
      namespace:kube_pod_container_resource_requests_cpu_cores:sum

  # Memory utilization vs limits
  - record: namespace:container_memory_working_set:ratio_limits
    expr: |
      namespace:container_memory_working_set_bytes:sum
      /
      namespace:kube_pod_container_resource_limits_memory_bytes:sum

  # Network throughput ratio (transmit/receive)
    - record: namespace:container_network_transmit_receive:ratio
      expr: |
        namespace:container_network_transmit_bytes:sum_rate
        /
        namespace:container_network_receive_bytes:sum_rate
```

These ratio rules reference existing recording rules, creating a fast cached result.

## Measuring Recording Rule Impact

Track the performance impact of recording rules:

```promql
# Time spent evaluating each rule group
prometheus_rule_group_duration_seconds{rule_group="namespace_metrics"}

# Number of samples produced by each rule
prometheus_rule_group_last_evaluation_samples{rule_group="namespace_metrics"}

# Total recording rule evaluation time
sum(rate(prometheus_rule_group_duration_seconds_sum[5m]))
```

Recording rules should take less than 10% of the evaluation interval to execute. If a 30s interval rule takes more than 3 seconds, optimize or remove it.

## Real-World Optimization Example

Here is a before/after optimization for a common dashboard query:

Before (8-12 seconds):
```promql
sum by (namespace) (
  rate(container_network_receive_bytes_total[5m])
) / 1024 / 1024
+
sum by (namespace) (
  rate(container_network_transmit_bytes_total[5m])
) / 1024 / 1024
```

Create recording rules:
```yaml
groups:
- name: network_optimized
  interval: 30s
  rules:
  - record: namespace:container_network_receive_bytes:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_network_receive_bytes_total{container!=""}[5m])
      )

  - record: namespace:container_network_transmit_bytes:sum_rate
    expr: |
      sum by (namespace) (
        rate(container_network_transmit_bytes_total{container!=""}[5m])
      )

  - record: namespace:container_network_total_megabytes:sum_rate
    expr: |
      (
        namespace:container_network_receive_bytes:sum_rate +
        namespace:container_network_transmit_bytes:sum_rate
      ) / 1024 / 1024
```

After (under 100ms):
```promql
namespace:container_network_total_megabytes:sum_rate
```

This achieves over 98% latency reduction by caching the expensive aggregation and unit conversion.

## Avoiding Common Pitfalls

Watch out for these anti-patterns:

1. **Recording rules that aren't used**: Delete unused rules to free resources
2. **Duplicate aggregations**: Consolidate similar rules into a hierarchy
3. **Too many labels**: Drop labels that aren't needed for queries
4. **Inefficient chaining**: Reference recorded metrics instead of re-computing
5. **Excessive granularity**: Pod-level recording rules rarely provide value

Optimized recording rules transform Prometheus from struggling with complex queries to delivering sub-second dashboard loads at any scale.
