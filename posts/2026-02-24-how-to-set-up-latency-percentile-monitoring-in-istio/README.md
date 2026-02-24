# How to Set Up Latency Percentile Monitoring in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Latency, Prometheus, Observability

Description: Learn how to configure and monitor latency percentiles like p50, p90, p95, and p99 in Istio using Prometheus and Grafana for better performance visibility.

---

Average latency is a terrible metric. If your API endpoint has an average response time of 200ms, that sounds great until you realize 5% of your users are waiting over 3 seconds. Percentile-based latency monitoring fixes this problem by showing you the real distribution of response times across your services.

Istio makes this straightforward because every sidecar proxy already collects detailed latency histograms. You just need to know how to query them properly and set up the right dashboards and alerts.

## Understanding Istio's Latency Metrics

Envoy proxies in Istio emit a histogram metric called `istio_request_duration_milliseconds`. This metric uses Prometheus histogram buckets to track how long requests take. The default buckets cover a wide range:

```
1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000
```

These buckets mean Prometheus stores counts of how many requests fell into each duration range. From these counts, you can calculate any percentile you want.

## Verifying Metrics Are Being Collected

First, make sure your Istio installation has telemetry enabled. Check that the Envoy sidecars are emitting metrics:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- \
  curl -s localhost:15000/stats/prometheus | grep istio_request_duration
```

You should see output with `istio_request_duration_milliseconds_bucket`, `istio_request_duration_milliseconds_sum`, and `istio_request_duration_milliseconds_count` lines.

If these metrics are missing, verify your Istio Telemetry configuration:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
```

## Customizing Histogram Buckets

The default buckets might not fit your use case. If your services typically respond in under 50ms, you want finer granularity at the low end. You can customize the buckets using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-latency-buckets
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT_AND_SERVER
          tagOverrides: {}
```

For more granular control over the histogram buckets, you can configure this through the mesh config in your Istio operator or Helm values:

```yaml
meshConfig:
  defaultConfig:
    proxyStatsMatcher:
      inclusionRegexps:
        - ".*request_duration.*"
```

## Prometheus Queries for Percentile Latency

Here is where the real value comes in. These PromQL queries give you the latency percentiles you actually care about.

**P50 (Median) Latency:**

```promql
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le)
)
```

**P90 Latency:**

```promql
histogram_quantile(0.90,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le)
)
```

**P99 Latency:**

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le)
)
```

The `reporter="destination"` label matters here. Using the destination reporter gives you the server-side measurement, which is usually what you want. If you use `reporter="source"`, you get the client-side view which includes network latency between pods.

## Breaking Down Latency by Dimensions

You can slice these percentiles by response code, source service, or HTTP method:

**P95 by Response Code:**

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le, response_code)
)
```

**P95 by Source Service:**

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le, source_workload)
)
```

**P95 by HTTP Method:**

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le, request_protocol)
)
```

## Setting Up Grafana Dashboards

Create a Grafana dashboard that shows the full percentile picture at a glance. Here is a JSON snippet for a panel that overlays p50, p90, p95, and p99:

```json
{
  "targets": [
    {
      "expr": "histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[$__rate_interval])) by (le))",
      "legendFormat": "p50"
    },
    {
      "expr": "histogram_quantile(0.90, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[$__rate_interval])) by (le))",
      "legendFormat": "p90"
    },
    {
      "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[$__rate_interval])) by (le))",
      "legendFormat": "p95"
    },
    {
      "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[$__rate_interval])) by (le))",
      "legendFormat": "p99"
    }
  ]
}
```

Use the `$__rate_interval` variable instead of a hardcoded duration so Grafana automatically picks the right window based on your scrape interval.

## Alerting on Latency Percentiles

Set up Prometheus alerting rules that fire when tail latency gets too high:

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
        - alert: HighP99Latency
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{
                reporter="destination"
              }[5m])) by (le, destination_service_name)
            ) > 1000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High p99 latency on {{ $labels.destination_service_name }}"
            description: "P99 latency is {{ $value }}ms for {{ $labels.destination_service_name }}"

        - alert: LatencySpike
          expr: |
            (
              histogram_quantile(0.99,
                sum(rate(istio_request_duration_milliseconds_bucket{
                  reporter="destination"
                }[5m])) by (le, destination_service_name)
              )
              /
              histogram_quantile(0.50,
                sum(rate(istio_request_duration_milliseconds_bucket{
                  reporter="destination"
                }[5m])) by (le, destination_service_name)
              )
            ) > 10
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Latency spike detected on {{ $labels.destination_service_name }}"
            description: "P99/P50 ratio exceeds 10x"
```

The second alert is particularly useful. It catches cases where tail latency is growing disproportionately compared to median latency, which usually indicates a subset of requests hitting a slow path.

## Comparing Client vs Server Latency

One useful technique is comparing the source reporter (client-side) latency against the destination reporter (server-side) latency. The difference tells you how much time is spent in the network between services:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="source"
  }[5m])) by (le)
)
-
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le)
)
```

If this delta is consistently large, you might have network issues, DNS resolution delays, or overloaded nodes.

## Practical Tips

Keep the rate window (`[5m]`) consistent across all your percentile queries. Using different windows for different percentiles will give you misleading comparisons.

Watch out for low-traffic services. When a service handles only a handful of requests per minute, percentile calculations from histograms become unreliable. The fewer requests you have, the less meaningful your p99 becomes.

If you notice your percentile values jumping between bucket boundaries (like constantly showing exactly 100ms or exactly 250ms), your histogram buckets are too coarse for the latency range your service operates in. Add more buckets in the relevant range.

Recording rules can help with performance if you have many services. Pre-computing percentiles avoids running expensive histogram_quantile calculations at query time:

```yaml
groups:
  - name: istio-latency-recording
    rules:
      - record: service:istio_request_duration_milliseconds:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(istio_request_duration_milliseconds_bucket{
              reporter="destination"
            }[5m])) by (le, destination_service_name)
          )
```

Latency percentile monitoring in Istio is one of those things that pays for itself almost immediately. Once you can see the p99 for every service in your mesh, you will catch performance regressions faster, understand your SLO compliance better, and debug production issues with actual data instead of guesswork.
