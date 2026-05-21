# How to Set Up Request Duration Histogram in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metric, Prometheus, Observability, Latency

Description: Configure and query request duration histograms in Istio to track latency percentiles and identify slow services using Prometheus and Grafana.

---

Tracking how long requests take is one of the most important observability signals. Average latency is misleading because it hides the tail. What you really want are percentiles: the 50th percentile (median), 95th percentile, and 99th percentile. Istio provides request duration metrics as histograms out of the box through its Envoy sidecars, and with Prometheus, you can slice and dice this data by service, version, response code, and more.

## What Istio Provides Out of the Box

Istio automatically collects the `istio_request_duration_milliseconds` histogram metric on every sidecar. This metric tracks the time from when the request is received by the proxy to when the response is fully sent. It includes:

- Source and destination service information
- Response code
- Request protocol
- Connection security status (mTLS or not)

The default histogram buckets are: 0.5, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000, 300000, 600000, 1800000, 3600000 milliseconds.

## Verifying Metrics Are Available

First, check that the metrics are being generated on a sidecar:

```bash
kubectl exec deploy/my-service -n default -c istio-proxy -- curl -s localhost:15090/stats/prometheus | grep istio_request_duration
```

You should see histogram bucket counters like:

```text
istio_request_duration_milliseconds_bucket{...le="100"...} 450
istio_request_duration_milliseconds_bucket{...le="250"...} 480
istio_request_duration_milliseconds_bucket{...le="500"...} 499
istio_request_duration_milliseconds_bucket{...le="+Inf"...} 500
istio_request_duration_milliseconds_sum{...} 25000
istio_request_duration_milliseconds_count{...} 500
```

## Setting Up Prometheus

If you do not already have Prometheus running, install the Istio addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/prometheus.yaml
```

Verify Prometheus is scraping Istio metrics:

```bash
istioctl dashboard prometheus
```

In the Prometheus UI, search for `istio_request_duration_milliseconds_bucket` and verify data is flowing.

## Key PromQL Queries

### P50 (Median) Latency per Service

```promql
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
)
```

### P95 Latency per Service

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
)
```

### P99 Latency per Service

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
)
```

The `reporter="destination"` filter means we are measuring latency as seen by the receiving service's sidecar. This gives you the closest server-side view of how long the request took after it reached the destination proxy.

### Latency by Response Code

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service_name="payment-service"}[5m])) by (le, response_code)
)
```

This shows P95 latency for payment-service, broken down by response code. Errors (5xx) are often slower than successes, so separating them gives you a clearer picture.

### Latency by Source Service

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service_name="payment-service"}[5m])) by (le, source_workload)
)
```

This tells you which calling services are experiencing the highest latency when talking to payment-service.

## Customizing Histogram Buckets

The default buckets might not fit your use case. If your service typically responds in under 10ms, the default buckets are too coarse at the low end. If your service handles long-running requests, you might need higher buckets.

Customize buckets using the `sidecar.istio.io/statsHistogramBuckets` annotation. For example, add the annotation to the pod template for the workload that needs different bucket boundaries:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-fast-service
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-fast-service
  template:
    metadata:
      labels:
        app: my-fast-service
      annotations:
        sidecar.istio.io/statsHistogramBuckets: '{"istiocustom":[1,5,10,25,50,100,250,500,1000,2500,5000,10000]}'
    spec:
      containers:
        - name: my-fast-service
          image: example/my-fast-service:latest
```

The `istiocustom` prefix applies the buckets to Istio standard histogram metrics such as `istio_request_duration_milliseconds`. Use the Telemetry API when you need to add, remove, or override metric dimensions; use the annotation when you need to change histogram bucket boundaries.

## Setting Up Grafana Dashboards

Install Grafana if you have not already:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/grafana.yaml
```

Istio comes with built-in Grafana dashboards that include request duration panels. Access them:

```bash
istioctl dashboard grafana
```

Navigate to the "Istio Service Dashboard" to see per-service latency graphs. The dashboard includes panels for P50, P90, P95, and P99 latency.

### Custom Dashboard Panel

If you want a custom panel, create one in Grafana with this query:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service_namespace="default"}[5m])) by (le, destination_service_name)
)
```

Set the visualization to a time series graph with the Y-axis labeled in milliseconds.

## Alerting on Latency

If you use Prometheus Operator, set up `PrometheusRule` alerting rules for latency degradation:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-latency-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-latency
      rules:
        - alert: HighP95Latency
          expr: |
            histogram_quantile(0.95,
              sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
            ) > 500
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High P95 latency on {{ $labels.destination_service_name }}"
            description: "P95 latency is {{ $value }}ms, exceeding 500ms threshold"
        - alert: VeryHighP99Latency
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
            ) > 2000
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical P99 latency on {{ $labels.destination_service_name }}"
            description: "P99 latency is {{ $value }}ms, exceeding 2000ms threshold"
```

## Comparing Client vs. Server Latency

Istio reports metrics from both the client side (`reporter="source"`) and the server side (`reporter="destination"`). Comparing the two helps you identify latency that is outside the destination service's server-side view:

```promql
# Client-side P95

histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", destination_service_name="payment-service"}[5m])) by (le)
)

# Server-side P95
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service_name="payment-service"}[5m])) by (le)
)
```

If client-side latency is significantly higher than server-side latency, that can point to network or client-side proxy overhead, connection pooling, retries, or other client-side effects.

## Troubleshooting Latency Issues

When you spot high latency:

1. **Check if it is specific to a source.** Break down by `source_workload` to see if one caller is experiencing higher latency.
2. **Check if it is specific to a response code.** Errors might have different latency profiles.
3. **Check if it correlates with traffic volume.** Higher request rates might cause latency increases.
4. **Check the request count.** A service with very few requests can show noisy percentiles.

```bash
# Check the proxy stats directly
kubectl exec deploy/my-service -c istio-proxy -- pilot-agent request GET stats | grep request_duration
```

## Summary

Istio's built-in request duration histogram gives you detailed latency visibility across your entire mesh without instrumenting your application code. Use Prometheus to query percentiles, Grafana to visualize trends, and alerting rules to catch regressions. Break down by source, destination, response code, and protocol to pinpoint exactly where latency issues originate. The combination of client-side and server-side metrics helps you separate application latency from network latency.
