# How to Set Up Four Golden Signals Monitoring with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Golden Signals, SRE, Monitoring, Prometheus

Description: Implement Google's Four Golden Signals monitoring framework (Latency, Traffic, Errors, Saturation) in your Istio service mesh with practical PromQL queries and alerting rules.

---

The Four Golden Signals come from Google's SRE book and represent the four most important metrics for monitoring any user-facing system: Latency, Traffic, Errors, and Saturation. Istio provides direct metrics for three of these out of the box, and the fourth (Saturation) requires a bit more work.

## The Four Golden Signals

| Signal | What It Measures | Istio Metric |
|--------|-----------------|-------------|
| Latency | How long requests take | `istio_request_duration_milliseconds` |
| Traffic | How much demand is placed on the system | `istio_requests_total` |
| Errors | The rate of failed requests | `istio_requests_total` (filtered) |
| Saturation | How full the system is | Container/Envoy metrics |

The difference between this and the RED method is the addition of Saturation. Saturation measures how close the system is to its capacity limits, which gives you early warning before things start failing.

## Signal 1: Latency

Latency should be measured as a distribution, not just an average. The SRE book specifically calls out the importance of separating successful request latency from error latency, because errors are often fast (an immediate 500 is faster than a successful response).

Successful request latency (P50, P95, P99):

```promql
# P50 latency for successful requests
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination",
    response_code!~"5.."
  }[5m])) by (le)
)

# P95 latency for successful requests
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination",
    response_code!~"5.."
  }[5m])) by (le)
)

# P99 latency for successful requests
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination",
    response_code!~"5.."
  }[5m])) by (le)
)
```

Error latency (how fast are errors?):

```promql
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination",
    response_code=~"5.."
  }[5m])) by (le)
)
```

If error latency is much lower than success latency, your service might be failing fast. If error latency is higher, the service might be timing out.

## Signal 2: Traffic

Traffic measures the demand on your system. For HTTP services, requests per second is the standard measure:

```promql
# Total requests per second
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m]))

# Traffic broken down by response code
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m])) by (response_code)

# Traffic by source service
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m])) by (source_workload)
```

For services that handle different types of requests, break traffic down further:

```promql
# Traffic by HTTP method
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m])) by (request_protocol)
```

You can also measure traffic by throughput (bytes per second):

```promql
# Inbound bytes per second
sum(rate(istio_request_bytes_sum{
  destination_service_name="my-api",
  reporter="destination"
}[5m]))

# Outbound bytes per second
sum(rate(istio_response_bytes_sum{
  destination_service_name="my-api",
  reporter="destination"
}[5m]))
```

## Signal 3: Errors

Errors should include both explicit errors (HTTP 5xx) and implicit errors (successful response codes with wrong content, or responses that violate an SLO):

```promql
# Explicit error rate (5xx responses)
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  response_code=~"5..",
  reporter="destination"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m]))

# Implicit errors: requests that succeeded but were too slow (above SLO)
# Percentage of requests above 500ms
1 - (
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination",
    le="500"
  }[5m]))
  /
  sum(rate(istio_request_duration_milliseconds_count{
    destination_service_name="my-api",
    reporter="destination"
  }[5m]))
)
```

The implicit error metric is powerful. A 200 OK response that took 30 seconds is effectively an error from the user's perspective.

Error breakdown by category:

```promql
# Client errors (4xx)
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  response_code=~"4..",
  reporter="destination"
}[5m])) by (response_code)

# Server errors (5xx)
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  response_code=~"5..",
  reporter="destination"
}[5m])) by (response_code)
```

## Signal 4: Saturation

Saturation is the trickiest signal because Istio does not directly expose it. You need to combine Istio metrics with Kubernetes resource metrics:

```promql
# CPU saturation: proxy CPU near limit
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace)
/
sum(kube_pod_container_resource_limits{container="istio-proxy", resource="cpu"}) by (pod, namespace)

# Memory saturation: proxy memory near limit
container_memory_working_set_bytes{container="istio-proxy"}
/
kube_pod_container_resource_limits{container="istio-proxy", resource="memory"}

# Connection pool saturation
envoy_cluster_upstream_rq_pending_active{}
/
envoy_cluster_upstream_rq_pending_total{}

# Request queue depth (saturation indicator)
sum(envoy_cluster_upstream_rq_pending_active{}) by (cluster_name)
```

The most relevant saturation signals for an Istio service:

```promql
# How full is the connection pool?
sum(envoy_cluster_upstream_cx_active{
  cluster_name=~"outbound.*my-api.*"
}) by (pod)

# Are requests being queued?
sum(envoy_cluster_upstream_rq_pending_active{
  cluster_name=~"outbound.*my-api.*"
}) by (pod)

# Thread pool saturation (application container)
sum(rate(container_cpu_usage_seconds_total{container="my-api"}[5m])) by (pod)
/
sum(kube_pod_container_resource_limits{container="my-api", resource="cpu"}) by (pod)
```

## Golden Signals Dashboard

Build a Grafana dashboard with four panels, one per signal:

```json
{
  "dashboard": {
    "title": "Four Golden Signals",
    "templating": {
      "list": [{
        "name": "service",
        "type": "query",
        "query": "label_values(istio_requests_total{reporter='destination'}, destination_service_name)"
      }]
    },
    "panels": [
      {
        "title": "Latency (P50 / P95 / P99)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {"expr": "histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\", response_code!~\"5..\"}[5m])) by (le))", "legendFormat": "P50"},
          {"expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\", response_code!~\"5..\"}[5m])) by (le))", "legendFormat": "P95"},
          {"expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\", response_code!~\"5..\"}[5m])) by (le))", "legendFormat": "P99"}
        ]
      },
      {
        "title": "Traffic (req/sec)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {"expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m]))", "legendFormat": "Total"},
          {"expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (response_code)", "legendFormat": "{{response_code}}"}
        ]
      },
      {
        "title": "Errors (%)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [
          {"expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", response_code=~\"5..\", reporter=\"destination\"}[5m])) / sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) * 100", "legendFormat": "5xx Error Rate"}
        ]
      },
      {
        "title": "Saturation",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "targets": [
          {"expr": "avg(sum(rate(container_cpu_usage_seconds_total{container=\"istio-proxy\", pod=~\".*$service.*\"}[5m])) by (pod) / sum(kube_pod_container_resource_limits{container=\"istio-proxy\", resource=\"cpu\", pod=~\".*$service.*\"}) by (pod))", "legendFormat": "Proxy CPU %"}
        ]
      }
    ]
  }
}
```

## Alerting on Golden Signals

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: golden-signals-alerts
  namespace: monitoring
spec:
  groups:
  - name: golden-signals
    rules:
    - alert: HighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
          by (destination_service_name, le)
        ) > 5000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P99 latency on {{ $labels.destination_service_name }}"

    - alert: TrafficAnomaly
      expr: |
        abs(
          sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
          -
          sum(rate(istio_requests_total{reporter="destination"}[5m] offset 1d)) by (destination_service_name)
        )
        /
        sum(rate(istio_requests_total{reporter="destination"}[5m] offset 1d)) by (destination_service_name)
        > 0.5
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Traffic anomaly on {{ $labels.destination_service_name }}: more than 50% change from yesterday"

    - alert: ErrorBudgetBurn
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5..", reporter="destination"}[1h])) by (destination_service_name)
          /
          sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_service_name)
        ) > 14.4 * 0.001
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "{{ $labels.destination_service_name }} is burning error budget too fast"
```

The Error Budget Burn alert uses a multi-window approach from the SRE book. A 14.4x burn rate over 1 hour means you would exhaust your monthly error budget (99.9% SLO) in about 2 days.

The Four Golden Signals give you a complete view of service health. Latency and Errors tell you about quality, Traffic tells you about demand, and Saturation tells you about capacity. With Istio, the first three come for free, and Saturation just needs a few extra Kubernetes metrics.
