# How to Configure Prometheus Recording Rules for Query Performance Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Recording Rules, Performance, Optimization, Monitoring

Description: Learn how to create and optimize Prometheus recording rules to pre-compute expensive queries and improve dashboard and alerting performance.

---

Complex Prometheus queries can slow down dashboards and alerting. Recording rules solve this by pre-computing query results at regular intervals and storing them as new time series. This transforms expensive aggregations into fast lookups. Well-designed recording rules reduce query latency from seconds to milliseconds, enabling real-time dashboards and responsive alerting even on large datasets.

## Understanding Recording Rules

Recording rules evaluate PromQL expressions periodically and save results as new metrics. Instead of running a complex aggregation every time you query, Prometheus pre-computes it and stores the result. When you query the recording rule metric, Prometheus returns pre-calculated values instantly.

Benefits:
- Dramatically faster dashboard load times
- Reduced CPU usage on Prometheus
- Consistent results across multiple queries
- Enables complex alerting rules that would timeout otherwise
- Simplifies PromQL in dashboards and alerts

The tradeoff is increased storage for the new time series and evaluation overhead.

## Basic Recording Rule

Create a PrometheusRule with recording rules:

```yaml
# recording-rules-basic.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: performance-recording-rules
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: instance-level-aggregations
      interval: 30s
      rules:
        # Pre-compute per-instance CPU usage
        - record: instance:node_cpu:rate5m
          expr: |
            sum without(cpu, mode) (
              rate(node_cpu_seconds_total{mode!="idle"}[5m])
            )

        # Pre-compute per-instance memory usage
        - record: instance:node_memory_usage:bytes
          expr: |
            node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
```

Apply the rule:

```bash
kubectl apply -f recording-rules-basic.yaml

# Verify the rule is loaded
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "instance-level-aggregations")'
```

Use the recording rule in queries:

```promql
# Instead of the complex query, use the recording rule
instance:node_cpu:rate5m

# Fast to aggregate further
avg(instance:node_cpu:rate5m)
```

## Naming Conventions

Follow the Prometheus naming convention for recording rules:

```
level:metric:operations
```

Where:
- **level** is the aggregation level (e.g., instance, job, cluster, namespace)
- **metric** is the base metric name
- **operations** describes the operations applied (e.g., rate5m, sum, avg)

Examples:

```yaml
rules:
  # Instance level
  - record: instance:node_cpu_utilization:rate5m
    expr: rate(node_cpu_seconds_total[5m])

  # Job level
  - record: job:http_requests:rate5m
    expr: sum without(instance) (rate(http_requests_total[5m]))

  # Cluster level
  - record: cluster:cpu_usage:sum
    expr: sum(instance:node_cpu_utilization:rate5m)

  # Namespace level
  - record: namespace:container_memory:sum
    expr: sum by (namespace) (container_memory_usage_bytes)
```

## Hierarchical Recording Rules

Build recording rules in layers for maximum reusability:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hierarchical-recording-rules
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: http-metrics-layer1
      interval: 30s
      rules:
        # Layer 1: Pod-level aggregations
        - record: pod:http_requests:rate5m
          expr: |
            sum by (namespace, pod, method, status) (
              rate(http_requests_total[5m])
            )

        - record: pod:http_request_duration:p95
          expr: |
            histogram_quantile(0.95,
              sum by (namespace, pod, le) (
                rate(http_request_duration_seconds_bucket[5m])
              )
            )

    - name: http-metrics-layer2
      interval: 30s
      rules:
        # Layer 2: Service-level aggregations (uses layer 1)
        - record: service:http_requests:rate5m
          expr: |
            sum by (namespace, service, method, status) (
              label_replace(
                pod:http_requests:rate5m,
                "service", "$1", "pod", "(.*)-[a-z0-9]+-[a-z0-9]+"
              )
            )

        - record: service:http_request_duration:p95
          expr: |
            avg by (namespace, service) (
              label_replace(
                pod:http_request_duration:p95,
                "service", "$1", "pod", "(.*)-[a-z0-9]+-[a-z0-9]+"
              )
            )

    - name: http-metrics-layer3
      interval: 60s
      rules:
        # Layer 3: Namespace-level aggregations (uses layer 2)
        - record: namespace:http_requests:rate5m
          expr: |
            sum by (namespace, method, status) (
              service:http_requests:rate5m
            )

        - record: namespace:http_error_rate:ratio
          expr: |
            sum by (namespace) (
              service:http_requests:rate5m{status=~"5.."}
            )
            / sum by (namespace) (
              service:http_requests:rate5m
            )
```

## Common Recording Rule Patterns

### Request Rate and Error Rate

```yaml
- name: request-metrics
  interval: 30s
  rules:
    # Total request rate per service
    - record: service:http_requests:rate5m
      expr: |
        sum by (namespace, service) (
          rate(http_requests_total[5m])
        )

    # Error rate per service
    - record: service:http_errors:rate5m
      expr: |
        sum by (namespace, service) (
          rate(http_requests_total{status=~"5.."}[5m])
        )

    # Success rate percentage
    - record: service:http_success_rate:percentage
      expr: |
        (
          sum by (namespace, service) (
            rate(http_requests_total{status!~"5.."}[5m])
          )
          / sum by (namespace, service) (
            rate(http_requests_total[5m])
          )
        ) * 100

    # Requests per second per replica
    - record: service:http_requests_per_replica:rate5m
      expr: |
        sum by (namespace, service) (
          rate(http_requests_total[5m])
        )
        / count by (namespace, service) (
          kube_pod_info{pod=~".*"}
        )
```

### Latency Percentiles

```yaml
- name: latency-metrics
  interval: 30s
  rules:
    # P50 latency
    - record: service:http_request_duration:p50
      expr: |
        histogram_quantile(0.50,
          sum by (namespace, service, le) (
            rate(http_request_duration_seconds_bucket[5m])
          )
        )

    # P95 latency
    - record: service:http_request_duration:p95
      expr: |
        histogram_quantile(0.95,
          sum by (namespace, service, le) (
            rate(http_request_duration_seconds_bucket[5m])
          )
        )

    # P99 latency
    - record: service:http_request_duration:p99
      expr: |
        histogram_quantile(0.99,
          sum by (namespace, service, le) (
            rate(http_request_duration_seconds_bucket[5m])
          )
        )

    # Average latency (simpler, faster)
    - record: service:http_request_duration:avg
      expr: |
        sum by (namespace, service) (
          rate(http_request_duration_seconds_sum[5m])
        )
        / sum by (namespace, service) (
          rate(http_request_duration_seconds_count[5m])
        )
```

### Resource Utilization

```yaml
- name: resource-metrics
  interval: 30s
  rules:
    # CPU usage by namespace
    - record: namespace:container_cpu:sum
      expr: |
        sum by (namespace) (
          rate(container_cpu_usage_seconds_total{container!=""}[5m])
        )

    # Memory usage by namespace
    - record: namespace:container_memory:sum
      expr: |
        sum by (namespace) (
          container_memory_usage_bytes{container!=""}
        )

    # Network receive rate by namespace
    - record: namespace:container_network_receive:rate5m
      expr: |
        sum by (namespace) (
          rate(container_network_receive_bytes_total[5m])
        )

    # Network transmit rate by namespace
    - record: namespace:container_network_transmit:rate5m
      expr: |
        sum by (namespace) (
          rate(container_network_transmit_bytes_total[5m])
        )

    # Pod count by namespace
    - record: namespace:pod_count:sum
      expr: |
        count by (namespace) (
          kube_pod_info
        )
```

### SLO Calculations

```yaml
- name: slo-metrics
  interval: 30s
  rules:
    # Availability SLO (requests succeeding)
    - record: slo:availability:ratio_rate5m
      expr: |
        sum(rate(http_requests_total{status!~"5.."}[5m]))
        / sum(rate(http_requests_total[5m]))

    # Latency SLO (requests under threshold)
    - record: slo:latency:ratio_rate5m
      expr: |
        sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
        / sum(rate(http_request_duration_seconds_count[5m]))

    # Error budget remaining (30 day window)
    - record: slo:error_budget:remaining
      expr: |
        1 - (
          (1 - 0.999)  # SLO target
          - (
            1 - (
              sum(rate(http_requests_total{status!~"5.."}[30d]))
              / sum(rate(http_requests_total[30d]))
            )
          )
        ) / (1 - 0.999)

    # Burn rate (how fast error budget is consumed)
    - record: slo:error_budget:burn_rate_1h
      expr: |
        (
          1 - (
            sum(rate(http_requests_total{status!~"5.."}[1h]))
            / sum(rate(http_requests_total[1h]))
          )
        ) / (1 - 0.999)
```

## Performance Optimization Strategies

### Interval Tuning

Set appropriate intervals based on use case:

```yaml
groups:
  # Fast-changing metrics (dashboards, frequent alerts)
  - name: high-frequency
    interval: 15s
    rules:
      - record: instance:cpu:rate1m
        expr: rate(node_cpu_seconds_total[1m])

  # Medium-frequency metrics (most use cases)
  - name: medium-frequency
    interval: 30s
    rules:
      - record: service:http_requests:rate5m
        expr: sum by (service) (rate(http_requests_total[5m]))

  # Low-frequency metrics (long-term trends)
  - name: low-frequency
    interval: 120s
    rules:
      - record: cluster:resource_usage:sum
        expr: sum(namespace:container_cpu:sum)
```

### Reducing Cardinality

Drop unnecessary labels in recording rules:

```yaml
rules:
  # Bad: preserves high-cardinality pod label
  - record: namespace:http_requests:rate5m
    expr: |
      sum by (namespace, pod) (
        rate(http_requests_total[5m])
      )

  # Good: aggregates to namespace level only
  - record: namespace:http_requests:rate5m
    expr: |
      sum by (namespace) (
        rate(http_requests_total[5m])
      )

  # Optionally keep important dimensions
  - record: namespace:http_requests_by_status:rate5m
    expr: |
      sum by (namespace, status) (
        rate(http_requests_total[5m])
      )
```

### Reusing Recording Rules

Build complex metrics from simpler recording rules:

```yaml
groups:
  - name: base-metrics
    interval: 30s
    rules:
      - record: service:requests:rate5m
        expr: sum by (service) (rate(http_requests_total[5m]))

      - record: service:errors:rate5m
        expr: sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))

  - name: derived-metrics
    interval: 30s
    rules:
      # Reuse base metrics instead of re-computing
      - record: service:error_rate:ratio
        expr: |
          service:errors:rate5m / service:requests:rate5m

      - record: service:success_rate:ratio
        expr: |
          1 - (service:errors:rate5m / service:requests:rate5m)
```

## Using Recording Rules in Alerts

Replace complex alert expressions with recording rules:

```yaml
# recording-rules.yaml
- name: alerting-support
  interval: 30s
  rules:
    - record: service:error_rate:ratio_rate5m
      expr: |
        sum by (namespace, service) (rate(http_requests_total{status=~"5.."}[5m]))
        / sum by (namespace, service) (rate(http_requests_total[5m]))

---
# alert-rules.yaml
- name: service-alerts
  interval: 30s
  rules:
    # Simple alert using recording rule
    - alert: HighErrorRate
      expr: |
        service:error_rate:ratio_rate5m > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate on {{ $labels.service }}"
        description: "Error rate is {{ $value | humanizePercentage }}."
```

## Monitoring Recording Rule Performance

Track recording rule evaluation:

```promql
# Evaluation duration
prometheus_rule_group_last_duration_seconds{rule_group="instance-level-aggregations"}

# Number of rules in group
count by (rule_group) (prometheus_rule_group_rules)

# Evaluation failures
rate(prometheus_rule_evaluation_failures_total[5m])
```

Create alerts for recording rule issues:

```yaml
- name: recording-rule-alerts
  interval: 30s
  rules:
    - alert: RecordingRuleSlow
      expr: |
        prometheus_rule_group_last_duration_seconds > 30
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Recording rule group {{ $labels.rule_group }} is slow"
        description: "Evaluation takes {{ $value }}s."

    - alert: RecordingRuleFailures
      expr: |
        rate(prometheus_rule_evaluation_failures_total[5m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Recording rules are failing"
        description: "{{ $value }} failures per second."
```

## Best Practices

1. Use recording rules for queries that appear in multiple dashboards or alerts
2. Follow the level:metric:operations naming convention
3. Build hierarchical recording rules to maximize reuse
4. Set intervals based on how frequently the metric changes
5. Drop unnecessary labels to reduce cardinality
6. Test recording rules before deploying to production
7. Monitor recording rule evaluation performance
8. Document the purpose and usage of each recording rule
9. Regularly review and remove unused recording rules
10. Balance between recording rule overhead and query performance

## Conclusion

Recording rules are essential for scaling Prometheus to large infrastructures and complex queries. By pre-computing expensive aggregations, you enable responsive dashboards and alerts while reducing load on Prometheus. Hierarchical recording rules maximize reusability and maintainability. Combined with proper naming conventions and performance monitoring, recording rules transform Prometheus from a metric store into a high-performance analytical database capable of real-time insights at scale.
