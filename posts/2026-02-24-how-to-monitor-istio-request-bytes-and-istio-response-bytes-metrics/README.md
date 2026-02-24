# How to Monitor istio_request_bytes and istio_response_bytes Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Throughput, Prometheus, Monitoring

Description: Track request and response payload sizes in Istio using the istio_request_bytes and istio_response_bytes histogram metrics for capacity planning and debugging.

---

Knowing how many requests your services handle is important, but knowing how much data those requests carry is equally valuable. The `istio_request_bytes` and `istio_response_bytes` metrics track the size of HTTP request and response bodies flowing through your mesh. These are useful for capacity planning, bandwidth monitoring, detecting unexpectedly large payloads, and troubleshooting performance issues caused by oversized responses.

## What These Metrics Track

Both `istio_request_bytes` and `istio_response_bytes` are Prometheus histograms. They measure the uncompressed size of the HTTP body in bytes (not including headers).

Like all Prometheus histograms, each creates three underlying time series:

```
istio_request_bytes_bucket{le="..."} - count of requests per size bucket
istio_request_bytes_sum              - total bytes across all requests
istio_request_bytes_count            - total number of requests

istio_response_bytes_bucket{le="..."} - count of responses per size bucket
istio_response_bytes_sum              - total bytes across all responses
istio_response_bytes_count            - total number of responses
```

The default bucket boundaries are:

```
1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, +Inf
```

These are in bytes, ranging from 1 byte to 10MB. Most API responses fall somewhere between 100 bytes and 100KB.

## Labels

These metrics carry the same labels as `istio_requests_total`:

```
istio_request_bytes_bucket{
  reporter="destination",
  source_workload="frontend",
  destination_workload="api-service",
  destination_workload_namespace="production",
  response_code="200",
  request_protocol="http",
  le="10000"
}
```

## Throughput Queries

### Total Data Throughput

Calculate the total bytes per second flowing through a service:

```promql
# Incoming data rate (request bodies)
sum(rate(istio_request_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))

# Outgoing data rate (response bodies)
sum(rate(istio_response_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Combined Bandwidth

```promql
# Total bandwidth (in + out) in bytes per second
sum(rate(istio_request_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
+
sum(rate(istio_response_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

To display in megabytes per second:

```promql
(
  sum(rate(istio_request_bytes_sum{reporter="destination",destination_workload="api-service"}[5m]))
  +
  sum(rate(istio_response_bytes_sum{reporter="destination",destination_workload="api-service"}[5m]))
) / 1024 / 1024
```

## Average Payload Size

### Average Request Size

```promql
sum(rate(istio_request_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
/
sum(rate(istio_request_bytes_count{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Average Response Size

```promql
sum(rate(istio_response_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
/
sum(rate(istio_response_bytes_count{
  reporter="destination",
  destination_workload="api-service"
}[5m]))
```

### Average Response Size by Source

See which clients are getting the biggest responses:

```promql
sum(rate(istio_response_bytes_sum{
  reporter="destination",
  destination_workload="api-service"
}[5m])) by (source_workload)
/
sum(rate(istio_response_bytes_count{
  reporter="destination",
  destination_workload="api-service"
}[5m])) by (source_workload)
```

## Percentile Payload Sizes

### P95 Response Size

```promql
histogram_quantile(0.95,
  sum(rate(istio_response_bytes_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)
```

### P99 Request Size

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_bytes_bucket{
    reporter="destination",
    destination_workload="api-service"
  }[5m])) by (le)
)
```

## Finding Large Payloads

### Services with the Largest Responses

```promql
topk(10,
  sum(rate(istio_response_bytes_sum{reporter="destination"}[5m]))
  by (destination_workload)
  /
  sum(rate(istio_response_bytes_count{reporter="destination"}[5m]))
  by (destination_workload)
)
```

### Services Generating the Most Total Data

```promql
topk(10,
  sum(rate(istio_response_bytes_sum{reporter="destination"}[5m]))
  by (destination_workload)
)
```

### Finding Large Uploads

Detect services receiving large request bodies (file uploads, bulk operations):

```promql
topk(10,
  histogram_quantile(0.99,
    sum(rate(istio_request_bytes_bucket{reporter="destination"}[5m]))
    by (destination_workload, le)
  )
)
```

## Monitoring Response Size Anomalies

### Detecting Sudden Response Size Changes

Compare current average response size to the previous hour:

```promql
(
  sum(rate(istio_response_bytes_sum{reporter="destination",destination_workload="api-service"}[5m]))
  /
  sum(rate(istio_response_bytes_count{reporter="destination",destination_workload="api-service"}[5m]))
)
/
(
  sum(rate(istio_response_bytes_sum{reporter="destination",destination_workload="api-service"}[5m] offset 1h))
  /
  sum(rate(istio_response_bytes_count{reporter="destination",destination_workload="api-service"}[5m] offset 1h))
)
```

A value above 2 means the average response size doubled. This could indicate a bug, a missing pagination limit, or a query returning too much data.

## Correlation with Latency

Large payloads often correlate with high latency. You can check this by comparing throughput with latency:

```promql
# Average response size for slow requests (> 1s)
sum(rate(istio_response_bytes_sum{
  reporter="destination",
  destination_workload="api-service",
  response_code="200"
}[5m]))
/
sum(rate(istio_response_bytes_count{
  reporter="destination",
  destination_workload="api-service",
  response_code="200"
}[5m]))
```

While you can't directly filter by latency in a single query, you can create a Grafana dashboard with correlated panels to visually identify the relationship.

## Alerting on Payload Sizes

### Alert on Unexpectedly Large Responses

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: payload-size-alerts
  namespace: monitoring
spec:
  groups:
    - name: payload-sizes
      rules:
        - alert: LargeAverageResponseSize
          expr: |
            (
              sum(rate(istio_response_bytes_sum{reporter="destination"}[5m]))
              by (destination_workload, destination_workload_namespace)
              /
              sum(rate(istio_response_bytes_count{reporter="destination"}[5m]))
              by (destination_workload, destination_workload_namespace)
            ) > 1048576
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Large average response size on {{ $labels.destination_workload }}"
            description: "Average response is {{ $value | humanize1024 }}B"

        - alert: HighBandwidthService
          expr: |
            sum(rate(istio_response_bytes_sum{reporter="destination"}[5m]))
            by (destination_workload, destination_workload_namespace) > 104857600
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.destination_workload }} is generating over 100MB/s of response data"
```

## Use Cases

### Capacity Planning

Track total bandwidth over time to plan network capacity:

```promql
# Total mesh bandwidth (all services)
sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) + sum(rate(istio_request_bytes_sum{reporter="destination"}[5m]))
```

### Compression Effectiveness

If you're using gzip compression, compare request sizes before and after compression by looking at both the Istio metric (uncompressed) and your actual network metrics.

### API Optimization

Find endpoints returning unnecessarily large responses:

```promql
# Response size per service, ranked
sort_desc(
  sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) by (destination_workload)
  /
  sum(rate(istio_response_bytes_count{reporter="destination"}[5m])) by (destination_workload)
)
```

Services at the top of this list are candidates for pagination, field filtering, or response compression.

## When to Disable These Metrics

If you're only interested in request counts and latency, and you're fighting high metric cardinality, `istio_request_bytes` and `istio_response_bytes` are good candidates for disabling:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-size-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: RESPONSE_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
```

Each histogram metric creates many time series (one per bucket), so disabling them can significantly reduce your Prometheus storage requirements.

However, if you're doing capacity planning or debugging payload-related performance issues, these metrics are invaluable. Keep them enabled for services where response size matters (like APIs serving large datasets or file downloads), and disable them for services where you only care about availability and latency.
