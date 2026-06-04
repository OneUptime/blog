# How to Implement Prometheus Metric Relabeling to Drop High-Cardinality Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Relabeling, Cardinality, Performance, Monitoring

Description: Learn how to use Prometheus relabeling to drop high-cardinality labels and prevent performance issues from excessive metric dimensions.

---

High-cardinality labels in Prometheus create performance problems. Each unique combination of label values creates a new time series, consuming memory and slowing queries. Labels like user IDs, session tokens, or request IDs can explode cardinality into millions of series. Metric relabeling provides tools to drop or transform labels before ingestion. This guide covers techniques to identify and fix cardinality problems.

## Understanding Cardinality

Cardinality is the number of unique time series for a metric. A time series is defined by a metric name and its unique label combinations:

```text
http_requests_total{method="GET", path="/api", status="200"}  # Series 1
http_requests_total{method="POST", path="/api", status="200"} # Series 2
http_requests_total{method="GET", path="/api", status="404"}  # Series 3
```

High cardinality occurs when label values have many unique combinations:

```text
# Bad: user_id has millions of values

http_requests_total{user_id="12345", method="GET"}
http_requests_total{user_id="67890", method="GET"}
# Results in millions of time series

# Good: aggregate at service level
http_requests_total{service="api", method="GET"}
# Results in manageable number of series
```

## Identifying High-Cardinality Labels

Check current cardinality in Prometheus:

```promql
# Total time series count
count({__name__=~".+"})

# Series per metric
count by (__name__) ({__name__=~".+"})

# Top metrics by cardinality
topk(20, count by (__name__) ({__name__=~".+"}))

# Check specific metric cardinality
count(http_requests_total)

# Series per label value
count by (label_name) (metric_name)
```

Query Prometheus metrics about itself:

```promql
# Total series in TSDB
prometheus_tsdb_head_series

# Cardinality by job
topk(10, count by (job) ({__name__=~".+"}))

# Memory usage
process_resident_memory_bytes
```

Use Prometheus UI to find problematic labels:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Query top metrics
curl -s 'http://localhost:9090/api/v1/label/__name__/values' | jq -r '.data[]' | \
  while read metric; do
    count=$(curl -s "http://localhost:9090/api/v1/query?query=count($metric)" | jq -r '.data.result[0].value[1]')
    echo "$count $metric"
  done | sort -rn | head -20
```

## Basic Metric Relabeling

Configure relabeling in ServiceMonitor or PodMonitor:

```yaml
# Drop high-cardinality labels
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
      metricRelabelings:
        # Drop user_id label
        - regex: user_id
          action: labeldrop

        # Drop session_id label
        - regex: session_id
          action: labeldrop

        # Drop request_id label
        - regex: request_id
          action: labeldrop

        # Drop any label ending in _id
        - regex: '.*_id'
          action: labeldrop
```

## Dropping Specific Metrics

Remove entire metrics with high cardinality:

```yaml
metricRelabelings:
  # Drop all metrics starting with debug_
  - sourceLabels: [__name__]
    regex: 'debug_.*'
    action: drop

  # Drop histogram buckets (keep count and sum)
  - sourceLabels: [__name__]
    regex: '.*_bucket'
    action: drop

  # Drop specific problematic metric
  - sourceLabels: [__name__]
    regex: 'http_request_duration_microseconds'
    action: drop
```

## Keeping Only Specific Metrics

Whitelist approach - keep only what you need:

```yaml
metricRelabelings:
  # Keep only these important metrics
  - sourceLabels: [__name__]
    regex: '(http_requests_total|http_request_duration_seconds_sum|http_request_duration_seconds_count|up|process_.*)'
    action: keep

  # Everything else is dropped
```

## Normalizing High-Cardinality Labels

Replace specific values with normalized categories only when the rewrite will not create duplicate series in the same scrape. If multiple original series can collapse to the same metric name and label set, use recording rules to aggregate them instead.

```yaml
metricRelabelings:
  # Add HTTP status classes while keeping the original status label
  - sourceLabels: [status]
    regex: '([0-9])..'
    targetLabel: status_class
    replacement: '${1}xx'
    action: replace

  # Normalize paths to remove parameters, only if the result stays unique
  - sourceLabels: [path]
    regex: '/api/users/[0-9]+(?:/.*)?'
    targetLabel: path
    replacement: '/api/users/:id'
    action: replace

  - sourceLabels: [path]
    regex: '/api/orders/[0-9]+(?:/.*)?'
    targetLabel: path
    replacement: '/api/orders/:id'
    action: replace

  # Aggregate HTTP methods to common patterns
  - sourceLabels: [method]
    regex: '(GET|POST|PUT|DELETE)'
    targetLabel: method
    replacement: '${1}'
    action: replace

  # Drop uncommon methods
  - sourceLabels: [method]
    regex: '(PATCH|HEAD|OPTIONS|TRACE)'
    action: drop
```

## Conditional Label Dropping

Prometheus relabeling cannot make `labeldrop` conditional on metric names or label values in a single relabel rule. The `labeldrop` action matches label names, not the concatenated `sourceLabels`. Use recording rules when you need metric-specific aggregation without a label:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: conditional-aggregation
  namespace: monitoring
spec:
  groups:
    - name: aggregation
      rules:
        # Remove instance only from this aggregated metric
        - record: cluster:http_requests:rate5m
          expr: sum without (instance) (rate(http_requests_total[5m]))

        # Remove pod only from this namespace-level metric
        - record: namespace:container_cpu_usage_seconds_total:rate5m
          expr: sum without (pod) (rate(container_cpu_usage_seconds_total[5m]))
```

## Limiting Label Values

Keep only top N values for a label:

```yaml
# This requires recording rules in Prometheus
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cardinality-reduction
  namespace: monitoring
spec:
  groups:
    - name: cardinality
      interval: 60s
      rules:
        # Aggregate by top 10 endpoints
        - record: http:requests:by_endpoint
          expr: |
            topk(10,
              sum by (endpoint) (rate(http_requests_total[5m]))
            )

        # Everything else becomes "other"
        - record: http:requests:by_endpoint
          labels:
            endpoint: other
          expr: |
            sum(
              sum by (endpoint) (rate(http_requests_total[5m]))
              unless
              topk(10, sum by (endpoint) (rate(http_requests_total[5m])))
            )
```

## Handling Kubernetes Labels

Drop verbose Kubernetes labels:

```yaml
metricRelabelings:
  # Drop pod UID (high cardinality, low value)
  - regex: pod_uid
    action: labeldrop

  # Drop container ID
  - regex: container_id
    action: labeldrop

  # Drop image ID (keep image name)
  - regex: image_id
    action: labeldrop

  # Drop pod IP (changes on restart)
  - regex: pod_ip
    action: labeldrop

  # Simplify pod names to deployment names
  - sourceLabels: [pod]
    regex: '(.*)-[a-z0-9]+-[a-z0-9]+'
    targetLabel: deployment
    replacement: '${1}'
    action: replace

  # Then optionally drop the pod label
  - regex: pod
    action: labeldrop
```

## Comprehensive Cardinality Management Strategy

Complete example for an application:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: comprehensive-cardinality-control
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: production-api
  endpoints:
    - port: metrics
      interval: 30s

      # Relabeling before scrape
      relabelings:
        # Add environment label
        - targetLabel: environment
          replacement: production
          action: replace

      # Metric relabeling after scrape
      metricRelabelings:
        # 1. Drop debug and test metrics
        - sourceLabels: [__name__]
          regex: '(debug_.*|test_.*|dev_.*)'
          action: drop

        # 2. Drop high-cardinality labels
        - regex: '(user_id|session_id|request_id|transaction_id|trace_id|span_id)'
          action: labeldrop

        # 3. Drop histogram buckets (optional)
        - sourceLabels: [__name__, le]
          regex: '.*_bucket;(0.005|0.01|0.025|0.05|0.075|0.1|0.25|0.75)'
          action: drop

        # 4. Add status classes
        - sourceLabels: [status_code]
          regex: '([0-9])..'
          targetLabel: status_class
          replacement: '${1}xx'
          action: replace

        # 5. Normalize paths, only if the result stays unique
        - sourceLabels: [path]
          regex: '/api/v1/users/[0-9]+.*'
          targetLabel: path
          replacement: '/api/v1/users/:id'
          action: replace

        - sourceLabels: [path]
          regex: '/api/v1/orders/[a-f0-9-]+.*'
          targetLabel: path
          replacement: '/api/v1/orders/:uuid'
          action: replace

        # 6. Keep only important Kubernetes labels
        - sourceLabels: [pod]
          regex: '(.*)-[a-z0-9]+-[a-z0-9]+'
          targetLabel: workload
          replacement: '${1}'
          action: replace
        - regex: pod
          action: labeldrop

        # 7. Keep only essential metrics
        - sourceLabels: [__name__]
          regex: '(http_requests_total|http_request_duration_seconds_(sum|count|bucket)|process_.*|up|go_.*)'
          action: keep
```

## Monitoring Cardinality Impact

Create alerts for cardinality growth:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cardinality-alerts
  namespace: monitoring
spec:
  groups:
    - name: cardinality
      interval: 5m
      rules:
        - alert: HighCardinality
          expr: |
            prometheus_tsdb_head_series > 1000000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Prometheus has high cardinality"
            description: "Prometheus has {{ $value }} time series."

        - alert: CardinalityGrowth
          expr: |
            rate(prometheus_tsdb_head_series[1h]) > 10000
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Cardinality growing rapidly"
            description: "Time series increasing by {{ $value }}/sec."

        - alert: HighMemoryUsage
          expr: |
            process_resident_memory_bytes > 8e9
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Prometheus memory usage is high"
            description: "Using {{ $value | humanize }}B of memory."
```

Query cardinality by job:

```promql
# Top jobs by cardinality
topk(10,
  count by (job) ({__name__=~".+"})
)

# Cardinality per metric per job
topk(20,
  count by (__name__, job) ({__name__=~".+"})
)

# Check specific label cardinality
count by (label_name) (metric_name{job="my-job"})
```

## Testing Relabeling Rules

Test relabeling before deploying:

```bash
# Use promtool to validate the Prometheus configuration syntax
cat > prometheus-test.yml <<EOF
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: test
    static_configs:
      - targets: ['localhost:9090']
    metric_relabel_configs:
      - source_labels: [status_code]
        regex: '([0-9])..'
        target_label: status_class
        replacement: '\${1}xx'
        action: replace
EOF

promtool check config prometheus-test.yml
```

After applying metric relabeling, query the affected metrics or use the `/api/v1/series` API to verify labels are dropped as expected. The Prometheus targets page is useful for target relabeling, but it does not show post-scrape metric labels.

## Best Practices

1. Identify high-cardinality labels before they cause problems
2. Drop identifiers (IDs, tokens, UUIDs) from metrics
3. Aggregate label values into categories when possible
4. Use recording rules to pre-aggregate instead of storing raw series
5. Keep only metrics you actually use in dashboards and alerts
6. Normalize dynamic path segments before they become labels
7. Monitor cardinality metrics and set alerts
8. Test relabeling rules in non-production first
9. Document why specific labels are dropped
10. Regularly audit and optimize relabeling rules

## Conclusion

Metric relabeling is essential for managing Prometheus cardinality and performance. By dropping high-cardinality labels, aggregating values, and filtering unnecessary metrics, you maintain a healthy Prometheus instance capable of scaling with your infrastructure. Combine relabeling with recording rules and thoughtful metric design to build an observability system that provides value without overwhelming your monitoring stack.
