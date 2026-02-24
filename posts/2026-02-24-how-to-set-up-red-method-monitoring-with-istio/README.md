# How to Set Up RED Method Monitoring with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RED Method, Monitoring, Prometheus, SRE

Description: Implement RED method monitoring (Rate, Errors, Duration) for your microservices using Istio's built-in metrics, with PromQL queries and Grafana dashboard examples.

---

The RED method is one of the simplest and most effective approaches to monitoring microservices. It focuses on three signals: Rate (how many requests per second), Errors (how many of those requests are failing), and Duration (how long those requests take). Istio gives you all three out of the box, no instrumentation needed.

## What is the RED Method?

Tom Wilkie coined the RED method as a way to monitor request-driven services. The idea is that for any service handling requests, you need to know:

- **Rate** - The number of requests per second
- **Errors** - The number of failed requests per second
- **Duration** - The distribution of request durations (latency)

These three signals cover the most important aspects of service health from the user's perspective. If the rate drops, something upstream stopped sending traffic. If errors spike, the service is broken. If duration increases, the service is slow.

## Istio Metrics for RED

Istio automatically collects the metrics you need:

| RED Signal | Istio Metric | Type |
|-----------|-------------|------|
| Rate | `istio_requests_total` | Counter |
| Errors | `istio_requests_total` (filtered by response_code) | Counter |
| Duration | `istio_request_duration_milliseconds` | Histogram |

You do not need to configure anything special. These metrics are collected by every sidecar proxy by default.

## Rate: Requests Per Second

The request rate for a service:

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", reporter="destination"}[5m]))
```

Rate broken down by source service:

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", reporter="destination"}[5m])) by (source_workload)
```

Rate by HTTP method:

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", reporter="destination"}[5m])) by (request_protocol, response_code)
```

The `reporter="destination"` filter ensures you are looking at the metrics from the server side, which is more accurate when retries are involved.

## Errors: Failed Requests

Error rate (5xx responses per second):

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", response_code=~"5..", reporter="destination"}[5m]))
```

Error percentage:

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", response_code=~"5..", reporter="destination"}[5m]))
/
sum(rate(istio_requests_total{destination_service_name="my-api", reporter="destination"}[5m]))
* 100
```

Including 4xx as errors (for APIs where 4xx indicates a problem):

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", response_code=~"[45]..", reporter="destination"}[5m]))
/
sum(rate(istio_requests_total{destination_service_name="my-api", reporter="destination"}[5m]))
* 100
```

Error rate by response code:

```promql
sum(rate(istio_requests_total{destination_service_name="my-api", response_code=~"[45]..", reporter="destination"}[5m])) by (response_code)
```

## Duration: Request Latency

P50 latency (median):

```promql
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-api", reporter="destination"}[5m]))
  by (le)
)
```

P95 latency:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-api", reporter="destination"}[5m]))
  by (le)
)
```

P99 latency:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-api", reporter="destination"}[5m]))
  by (le)
)
```

Average latency:

```promql
sum(rate(istio_request_duration_milliseconds_sum{destination_service_name="my-api", reporter="destination"}[5m]))
/
sum(rate(istio_request_duration_milliseconds_count{destination_service_name="my-api", reporter="destination"}[5m]))
```

## Building a RED Dashboard in Grafana

Here is a Grafana dashboard JSON for a single service:

```json
{
  "dashboard": {
    "title": "RED Dashboard - my-api",
    "templating": {
      "list": [
        {
          "name": "service",
          "type": "query",
          "query": "label_values(istio_requests_total, destination_service_name)",
          "current": {"text": "my-api"}
        }
      ]
    },
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m]))",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate (%)",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", response_code=~\"5..\", reporter=\"destination\"}[5m])) / sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "thresholdsStyle": {"mode": "line"}
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "red", "value": 1}
              ]
            }
          }
        }
      },
      {
        "title": "Request Duration",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 0},
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (le))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (le))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (le))",
            "legendFormat": "P99"
          }
        ]
      }
    ]
  }
}
```

## Setting Up Alerts

Alert on each RED signal:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: red-alerts
  namespace: monitoring
spec:
  groups:
  - name: red-method
    rules:
    - alert: HighErrorRate
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5..", reporter="destination"}[5m])) by (destination_service_name)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
        ) > 0.01
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "{{ $labels.destination_service_name }} error rate above 1%"

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
        summary: "{{ $labels.destination_service_name }} P99 latency above 5 seconds"

    - alert: TrafficDrop
      expr: |
        sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
        < 0.1
        and
        sum(rate(istio_requests_total{reporter="destination"}[1h] offset 1d)) by (destination_service_name)
        > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "{{ $labels.destination_service_name }} traffic dropped significantly"
```

The TrafficDrop alert compares current traffic to the same time yesterday. If a service was getting traffic yesterday but is getting almost none now, something is probably wrong.

## RED for All Services at Once

For a mesh-wide RED overview:

```promql
# Top 10 services by request rate
topk(10, sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name))

# Services with error rates above 0
sum(rate(istio_requests_total{response_code=~"5..", reporter="destination"}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
> 0

# Services with high P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
  by (destination_service_name, le)
) > 1000
```

The RED method is popular because it is simple and covers the most important aspects of service health. With Istio, you get RED metrics for free across every service in your mesh. The only work is building the dashboards and alerts, and the PromQL queries above give you everything you need.
