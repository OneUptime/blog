# How to Monitor Kubernetes API Server Latency Percentiles with Custom PromQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, Performance

Description: Master the art of monitoring Kubernetes API server latency using advanced PromQL queries to track percentiles, identify slow endpoints, and optimize cluster control plane performance.

---

The Kubernetes API server is the heart of your cluster. Every kubectl command, controller action, and cluster state change flows through it. When API server latency spikes, everything slows down. This guide teaches you how to build sophisticated PromQL queries that track API server performance at different percentile levels, helping you catch performance issues before they impact users.

## Understanding API Server Latency Metrics

The API server exposes several histogram metrics for request latency:

- `apiserver_request_duration_seconds` - Complete request duration including response body streaming
- `apiserver_response_sizes` - Response size distribution
- `apiserver_request_total` - Request counter with labels for verb, resource, and status code

These metrics include labels for resource type, verb (GET, LIST, CREATE, etc.), and response code, enabling detailed analysis.

## Basic Percentile Queries

Start with fundamental percentile calculations to understand API server performance:

```promql
# 95th percentile of API server request duration across all requests
histogram_quantile(
  0.95,
  sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
)

# 99th percentile for a more comprehensive view of tail latency
histogram_quantile(
  0.99,
  sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
)

# 50th percentile (median) for typical request performance
histogram_quantile(
  0.50,
  sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
)
```

These queries give you a baseline understanding of API server performance across all operations.

## Analyzing Latency by Resource Type

Different Kubernetes resources have different performance characteristics. Track them separately:

```promql
# 95th percentile latency by resource type
histogram_quantile(
  0.95,
  sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
)

# Compare latency across core resources
histogram_quantile(
  0.95,
  sum(
    rate(
      apiserver_request_duration_seconds_bucket{
        resource=~"pods|services|deployments|configmaps"
      }[5m]
    )
  ) by (le, resource)
)

# Focus on custom resources which often have higher latency
histogram_quantile(
  0.95,
  sum(
    rate(
      apiserver_request_duration_seconds_bucket{
        group!=""
      }[5m]
    )
  ) by (le, resource, group)
)
```

## Breaking Down Latency by Operation Type

Different verbs have different latency profiles. LIST operations are typically slower than GET:

```promql
# Latency by verb (GET, LIST, CREATE, UPDATE, DELETE, PATCH)
histogram_quantile(
  0.95,
  sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, verb)
)

# Compare read vs write operations
# Read operations (GET, LIST)
histogram_quantile(
  0.95,
  sum(
    rate(
      apiserver_request_duration_seconds_bucket{
        verb=~"GET|LIST|WATCH"
      }[5m]
    )
  ) by (le, verb)
)

# Write operations (CREATE, UPDATE, PATCH, DELETE)
histogram_quantile(
  0.95,
  sum(
    rate(
      apiserver_request_duration_seconds_bucket{
        verb=~"CREATE|UPDATE|PATCH|DELETE"
      }[5m]
    )
  ) by (le, verb)
)
```

## Identifying Slow Endpoints

Pinpoint specific API endpoints with performance issues:

```promql
# Top 10 slowest endpoints by p95 latency
topk(10,
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m]))
      by (le, resource, verb, scope)
  )
)

# Slowest LIST operations (common bottleneck)
topk(5,
  histogram_quantile(
    0.95,
    sum(
      rate(
        apiserver_request_duration_seconds_bucket{
          verb="LIST"
        }[5m]
      )
    ) by (le, resource)
  )
)

# Identify resources with highest latency variance
stddev(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m]))
      by (le, resource, verb)
  )
) by (resource, verb)
```

## Multi-Percentile Analysis

Compare multiple percentiles to understand latency distribution:

```promql
# Create a multi-percentile view
# p50
label_replace(
  histogram_quantile(
    0.50,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
  ),
  "percentile", "p50", "", ""
)
or
# p90
label_replace(
  histogram_quantile(
    0.90,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
  ),
  "percentile", "p90", "", ""
)
or
# p95
label_replace(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
  ),
  "percentile", "p95", "", ""
)
or
# p99
label_replace(
  histogram_quantile(
    0.99,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
  ),
  "percentile", "p99", "", ""
)
```

## Detecting Latency Spikes

Create queries that identify when latency exceeds baseline:

```promql
# Detect when p95 latency exceeds 2x the hourly average
(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
  )
  >
  2 * avg_over_time(
    histogram_quantile(
      0.95,
      sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
    )[1h:5m]
  )
)

# Identify sudden latency increases
deriv(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
  )[5m]
) > 0.1
```

## Correlating Latency with Request Rate

High latency often correlates with high request volume:

```promql
# Request rate by resource
sum(rate(apiserver_request_total[5m])) by (resource)

# Latency vs rate correlation
(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, resource)
  )
  /
  (sum(rate(apiserver_request_total[5m])) by (resource) + 1)
)
```

## Monitoring etcd Latency Impact

API server latency heavily depends on etcd performance:

```promql
# etcd request latency from API server perspective
histogram_quantile(
  0.95,
  sum(rate(etcd_request_duration_seconds_bucket[5m])) by (le, operation)
)

# Correlate API server and etcd latency
(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket{verb="GET"}[5m])) by (le)
  )
  -
  histogram_quantile(
    0.95,
    sum(rate(etcd_request_duration_seconds_bucket{operation="get"}[5m])) by (le)
  )
)
```

## Creating Alert Rules for Latency

Build alert rules that fire when latency degrades:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-server-latency-alerts
  namespace: monitoring
spec:
  groups:
  - name: apiserver_latency
    interval: 30s
    rules:
    # Alert on high p99 latency
    - alert: APIServerHighP99Latency
      expr: |
        histogram_quantile(
          0.99,
          sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, verb, resource)
        ) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "API server p99 latency is high"
        description: "API server {{ $labels.verb }} requests for {{ $labels.resource }} have p99 latency of {{ $value }}s"

    # Alert on LIST operation latency
    - alert: APIServerSlowLIST
      expr: |
        histogram_quantile(
          0.95,
          sum(
            rate(
              apiserver_request_duration_seconds_bucket{verb="LIST"}[5m]
            )
          ) by (le, resource)
        ) > 5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "API server LIST operations are slow"
        description: "LIST operations for {{ $labels.resource }} have p95 latency of {{ $value }}s"

    # Alert on latency degradation
    - alert: APIServerLatencyDegradation
      expr: |
        (
          histogram_quantile(
            0.95,
            sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
          )
          >
          1.5 * avg_over_time(
            histogram_quantile(
              0.95,
              sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
            )[1h:5m]
          )
        )
        and
        (
          histogram_quantile(
            0.95,
            sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        )
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "API server latency degradation detected"
        description: "API server p95 latency is {{ $value }}s, 50% higher than normal"
```

## Analyzing Latency by Client

Identify which clients are generating slow requests:

```promql
# Latency by user agent
histogram_quantile(
  0.95,
  sum(rate(apiserver_request_duration_seconds_bucket[5m]))
    by (le, client)
)

# Top clients by request volume
topk(10,
  sum(rate(apiserver_request_total[5m])) by (client)
)

# Latency for controller requests
histogram_quantile(
  0.95,
  sum(
    rate(
      apiserver_request_duration_seconds_bucket{
        client=~".*controller.*"
      }[5m]
    )
  ) by (le, client)
)
```

## Tracking Long-Running Requests

Monitor WATCH operations and other long-running requests separately:

```promql
# Active WATCH requests
sum(apiserver_longrunning_gauge) by (resource)

# WATCH request latency (startup time)
histogram_quantile(
  0.95,
  sum(
    rate(
      apiserver_request_duration_seconds_bucket{verb="WATCH"}[5m]
    )
  ) by (le, resource)
)
```

## Creating Comprehensive Dashboards

Build a Grafana dashboard query that combines multiple dimensions:

```promql
# Comprehensive API server latency view
sum(
  histogram_quantile(
    0.95,
    sum(rate(apiserver_request_duration_seconds_bucket[5m]))
      by (le, verb, resource, code)
  )
) by (verb, resource)
> 0.1  # Filter out very fast operations
```

## Performance Optimization Queries

Use these queries to guide optimization efforts:

```promql
# Calculate average bucket size for LIST operations
avg(
  apiserver_response_sizes_sum{verb="LIST"}
  /
  apiserver_response_sizes_count{verb="LIST"}
) by (resource)

# Identify resources with large response sizes
topk(10,
  histogram_quantile(
    0.95,
    sum(rate(apiserver_response_sizes_bucket[5m])) by (le, resource)
  )
)

# Request rate per second by resource
topk(20,
  sum(rate(apiserver_request_total[1m])) by (resource, verb)
)
```

## Recording Rules for Performance

Create recording rules to speed up dashboard queries:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: apiserver-recording-rules
  namespace: monitoring
spec:
  groups:
  - name: apiserver_latency_percentiles
    interval: 30s
    rules:
    # Pre-calculate p50, p95, p99 for common queries
    - record: apiserver:request_duration_seconds:p95
      expr: |
        histogram_quantile(
          0.95,
          sum(rate(apiserver_request_duration_seconds_bucket[5m]))
            by (le, resource, verb)
        )

    - record: apiserver:request_duration_seconds:p99
      expr: |
        histogram_quantile(
          0.99,
          sum(rate(apiserver_request_duration_seconds_bucket[5m]))
            by (le, resource, verb)
        )

    - record: apiserver:request_rate:sum
      expr: |
        sum(rate(apiserver_request_total[5m])) by (resource, verb, code)
```

## Conclusion

Monitoring Kubernetes API server latency percentiles is essential for maintaining cluster health. By tracking p95 and p99 latency across different resources, verbs, and clients, you gain deep visibility into control plane performance. Use these PromQL queries to build dashboards that surface performance issues, create alerts that catch degradation early, and identify optimization opportunities.

Start with basic percentile tracking, then layer in resource-specific analysis, multi-percentile comparisons, and correlation with request rates. The result is comprehensive API server observability that helps you maintain responsive cluster operations even as your workloads scale.
