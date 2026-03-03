# How to Monitor istio_request_duration_milliseconds Metric

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Latency, Metrics, Prometheus, Performance

Description: Monitor request latency in Istio using the istio_request_duration_milliseconds histogram metric with percentile calculations and alerting strategies.

---

Latency is one of the most important indicators of user experience. If your API takes 3 seconds to respond, users won't care that it returned a 200 status code. The `istio_request_duration_milliseconds` metric tracks how long each request takes from the perspective of the Envoy proxy, giving you latency measurements across your entire mesh without any application-level instrumentation.

## How This Metric Works

`istio_request_duration_milliseconds` is a Prometheus histogram. That means it doesn't store individual latency values. Instead, it maintains counts of requests that fell into predefined time buckets. For example, it counts how many requests took less than 1ms, less than 5ms, less than 10ms, and so on.

In Prometheus, a histogram actually creates three underlying time series:

- `istio_request_duration_milliseconds_bucket` - count of requests per bucket
- `istio_request_duration_milliseconds_sum` - total cumulative duration of all requests
- `istio_request_duration_milliseconds_count` - total number of requests (same as `istio_requests_total`)

The bucket boundaries (the `le` label values) default to:

```text
0.5, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000, 300000, 600000, +Inf
```

These are in milliseconds. So the buckets cover from 0.5ms to 600 seconds, which handles everything from fast cache lookups to slow batch operations.

## The Labels

This metric carries the same labels as `istio_requests_total`:

```text
istio_request_duration_milliseconds_bucket{
  reporter="destination",
  source_workload="frontend",
  destination_workload="api-service",
  destination_workload_namespace="production",
  response_code="200",
  request_protocol="http",
  le="100"
} 45892
```

The `le` label (less than or equal) indicates the bucket boundary. The value `45892` means 45,892 requests took 100ms or less.

## Calculating Percentile Latency

The main function you'll use is `histogram_quantile()`. It takes a quantile value (0 to 1) and a set of bucket time series, and estimates the latency at that percentile.

### P50 (Median Latency)

```promql
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service",
    destination_workload_namespace="production"
  }[5m])) by (le)
)
```

### P95 Latency

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)
```

### P99 Latency

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)
```

### All Three on One Graph

In Grafana, create a panel with three queries:

Query A:
```promql
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",destination_workload="$workload"}[5m])) by (le))
```

Query B:
```promql
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",destination_workload="$workload"}[5m])) by (le))
```

Query C:
```promql
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",destination_workload="$workload"}[5m])) by (le))
```

Use legend labels "P50", "P95", and "P99" for clarity.

## Average Latency

Sometimes you need the average (mean) latency. Calculate it from the `_sum` and `_count` sub-metrics:

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

Be careful with averages though. An average of 50ms could mean all requests take 50ms, or it could mean half take 1ms and half take 99ms. Percentiles give a much better picture.

## Breaking Down Latency by Dimensions

### Latency by Source Service

See which callers experience the most latency:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (source_workload, le)
)
```

### Latency by Response Code

Compare latency of successful vs failed requests:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (response_code, le)
)
```

Typically, 500 errors are either very fast (validation failures, immediate errors) or very slow (timeouts). This query helps you see which pattern applies.

### Latency by Response Flags

Check if Envoy-specific issues are causing slow requests:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="api-service",
    response_flags!~"-"
  }[5m])) by (response_flags, le)
)
```

## Latency Across All Services

### Slowest Services in the Mesh

```promql
topk(10,
  histogram_quantile(0.99,
    sum(rate(istio_request_duration_milliseconds_bucket{
      reporter="destination"
    }[5m])) by (destination_workload, le)
  )
)
```

### Latency Distribution Heatmap

In Grafana, use the Heatmap panel type with this query:

```promql
sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_workload="api-service"
}[5m])) by (le)
```

Set the format to "Heatmap" and the data type to "Buckets". This shows how the latency distribution changes over time, making it easy to spot bimodal distributions or gradual degradation.

## Alerting on Latency

### SLO-Based Alert

If your SLO says P99 latency should be under 500ms:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: latency-alerts
  namespace: monitoring
spec:
  groups:
    - name: latency
      rules:
        - alert: LatencySLOBreach
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{
                reporter="destination"
              }[5m])) by (destination_workload, destination_workload_namespace, le)
            ) > 500
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "P99 latency SLO breach on {{ $labels.destination_workload }}"
            description: "P99 latency is {{ $value | humanize }}ms, SLO is 500ms"
```

### Latency Spike Detection

Alert when latency is significantly higher than its recent baseline:

```yaml
- alert: LatencySpike
  expr: |
    histogram_quantile(0.95,
      sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
      by (destination_workload, destination_workload_namespace, le)
    )
    > 3 *
    histogram_quantile(0.95,
      sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m] offset 1h))
      by (destination_workload, destination_workload_namespace, le)
    )
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Latency spike on {{ $labels.destination_workload }}"
```

## Recording Rules for Latency

Pre-compute common latency queries:

```yaml
rules:
  - record: istio:service:latency_p50_5m
    expr: |
      histogram_quantile(0.50,
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace, le)
      )

  - record: istio:service:latency_p99_5m
    expr: |
      histogram_quantile(0.99,
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace, le)
      )

  - record: istio:service:latency_avg_5m
    expr: |
      sum(rate(istio_request_duration_milliseconds_sum{reporter="destination"}[5m]))
      by (destination_workload, destination_workload_namespace)
      /
      sum(rate(istio_request_duration_milliseconds_count{reporter="destination"}[5m]))
      by (destination_workload, destination_workload_namespace)
```

## What This Metric Measures (and What It Doesn't)

This metric measures the time from when the Envoy proxy starts processing a request to when the response is fully sent back. This includes:

- Time waiting for the upstream connection
- Time the upstream service spends processing the request
- Time to transmit the response
- Any retry time (if retries are configured)

It does not include:
- Time spent in the client application before the request is sent
- Network latency from the client to the source proxy
- Queue time before the proxy picks up the request

For the `reporter="destination"` view, the measurement is from the destination's Envoy sidecar perspective. For `reporter="source"`, it includes the network time between the two sidecars.

## Histogram Accuracy

Because histograms use predefined buckets, percentile calculations are estimates. If your actual P99 latency is 750ms, and your buckets are `[500, 1000]`, the reported P99 will be somewhere between 500 and 1000 based on linear interpolation. The more buckets you have in the relevant range, the more accurate the estimate.

If you need better accuracy for specific latency ranges, you can customize the histogram buckets. But this requires adjusting the stats plugin configuration through EnvoyFilter, which is an advanced operation.

The `istio_request_duration_milliseconds` metric, combined with `istio_requests_total`, gives you a thorough picture of your service mesh performance. Track percentiles rather than averages, break down latency by source and response code to find patterns, and set up alerts based on your SLOs.
