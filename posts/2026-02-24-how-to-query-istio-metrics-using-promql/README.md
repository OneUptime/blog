# How to Query Istio Metrics Using PromQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PromQL, Prometheus, Monitoring, Observability

Description: Master PromQL queries for Istio metrics to analyze service mesh traffic patterns, error rates, latency distributions, and performance bottlenecks.

---

PromQL is the query language for Prometheus, and if you're running Istio with Prometheus, you'll be writing PromQL queries regularly. Whether you're building Grafana dashboards, writing alerting rules, or just debugging an incident, knowing how to query Istio metrics effectively is a must-have skill. This guide covers the PromQL patterns you'll use most often with Istio metrics.

## PromQL Basics Refresher

Before getting into Istio-specific queries, a quick refresher on PromQL concepts:

- **Instant vector** - a set of time series, each with a single sample at a point in time
- **Range vector** - a set of time series, each with a range of samples over time (e.g., `[5m]`)
- **rate()** - calculates the per-second rate of increase of a counter over a range
- **sum()** - aggregates multiple series into one
- **histogram_quantile()** - calculates percentiles from histogram buckets
- **by()** - groups results by specified labels
- **without()** - groups results by all labels except specified ones

## Request Rate Queries

The most basic query - how many requests per second is a service handling:

```promql
# Total request rate for a service
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

Break it down by response code:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m])) by (response_code)
```

See who's calling the service:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m])) by (source_workload)
```

## Error Rate Queries

### Simple Error Rate

```promql
# 5xx error rate as a decimal (0.05 = 5%)
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  response_code=~"5.."
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Error Rate Per Service (Mesh-Wide)

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  response_code=~"5.."
}[5m])) by (destination_workload)
/
sum(rate(istio_requests_total{
  reporter="destination"
}[5m])) by (destination_workload)
```

### Error Rate Excluding 404s

Sometimes 404s are normal (client requesting non-existent resources). Exclude them:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  response_code=~"5..",
  response_code!="404"
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Availability (Inverse of Error Rate)

```promql
1 - (
  sum(rate(istio_requests_total{
    reporter="destination",
    destination_workload="api-service",
    response_code=~"5.."
  }[5m]))
  /
  sum(rate(istio_requests_total{
    reporter="destination",
    destination_workload="api-service"
  }[5m]))
)
```

## Latency Queries

Istio uses `istio_request_duration_milliseconds` as a histogram. You use `histogram_quantile()` to extract percentiles.

### P50, P90, P99 Latency

```promql
# P50 (median)
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)

# P90
histogram_quantile(0.90,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)

# P99
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)
```

### Latency Per Source Service

See which callers experience the worst latency:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (source_workload, le)
)
```

The `le` (less than or equal) label must always be in the `by()` clause for `histogram_quantile()` to work.

### Average Latency

```promql
sum(rate(istio_request_duration_milliseconds_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
/
sum(rate(istio_request_duration_milliseconds_count{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Latency for Specific Response Codes

Compare latency of successful vs failed requests:

```promql
# P95 latency for 200 responses
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service",
    response_code="200"
  }[5m])) by (le)
)

# P95 latency for 500 responses
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service",
    response_code="500"
  }[5m])) by (le)
)
```

## Throughput Queries

### Request Throughput in Bytes

```promql
# Average request size
sum(rate(istio_request_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
/
sum(rate(istio_request_bytes_count{
  reporter="destination",
  destination_workload="api-service"
}[5m]))

# Total bytes per second
sum(rate(istio_response_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

## Top-N Queries

### Top 10 Services by Request Rate

```promql
topk(10,
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload)
)
```

### Top 10 Services by Error Rate (with minimum traffic threshold)

Only show services with at least 1 request per second to avoid noisy results:

```promql
topk(10,
  (
    sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m])) by (destination_workload)
    /
    sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload)
  )
  and
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload) > 1
)
```

### Top 10 Slowest Services

```promql
topk(10,
  histogram_quantile(0.99,
    sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
    by (destination_workload, le)
  )
)
```

## Comparison Queries

### Week-Over-Week Traffic Comparison

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
/
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service"
}[5m] offset 7d))
```

Values above 1 mean traffic increased; below 1 means it decreased.

### Hour-Over-Hour Error Rate Change

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  response_code=~"5.."
}[5m]))
-
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="api-service",
  response_code=~"5.."
}[5m] offset 1h))
```

Positive values mean errors are increasing; negative means they're decreasing.

## mTLS Coverage

```promql
# Percentage of mTLS traffic per service
sum(rate(istio_requests_total{
  reporter="destination",
  connection_security_policy="mutual_tls"
}[5m])) by (destination_workload)
/
sum(rate(istio_requests_total{
  reporter="destination"
}[5m])) by (destination_workload)
* 100
```

## Service Dependency Mapping

Build a service dependency map from metrics:

```promql
# All service-to-service communication paths
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (source_workload, destination_workload) > 0
```

This returns every active communication path in your mesh.

## Recording Rules for Common Queries

Frequently used queries should be turned into recording rules for better performance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-metrics
      interval: 30s
      rules:
        - record: istio:service:request_rate_5m
          expr: |
            sum(rate(istio_requests_total{reporter="destination"}[5m]))
            by (destination_workload, destination_workload_namespace)

        - record: istio:service:error_rate_5m
          expr: |
            sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m]))
            by (destination_workload, destination_workload_namespace)
            /
            sum(rate(istio_requests_total{reporter="destination"}[5m]))
            by (destination_workload, destination_workload_namespace)

        - record: istio:service:latency_p99_5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
              by (destination_workload, destination_workload_namespace, le)
            )
```

Now your dashboards and alerts can query `istio:service:error_rate_5m` instead of recalculating the error rate every time.

## Common Gotchas

**Double counting**: Always filter by `reporter="destination"` or `reporter="source"`, not both. Each request is reported twice.

**The `le` label**: When using `histogram_quantile()`, you must include `le` in the `by()` clause. Forgetting it returns incorrect results.

**Empty results with division**: If the denominator is zero, PromQL returns no data rather than an error. Use `or vector(0)` if you need a default:

```promql
(sum(rate(istio_requests_total{response_code=~"5.."}[5m])) or vector(0))
/
sum(rate(istio_requests_total[5m]))
```

**Rate interval**: Use `[5m]` as a minimum range for `rate()`. Shorter ranges can produce unreliable results, especially with 30-second scrape intervals. A good rule is at least 4x your scrape interval.

PromQL is the key to unlocking Istio's observability data. Master these query patterns and you'll be able to answer almost any question about your mesh's health and performance.
