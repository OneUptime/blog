# How to Set Up Alerting for High Latency in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Latency, Alerting, Prometheus, SLO, Monitoring

Description: A step-by-step guide to configuring latency-based alerts in Istio using Prometheus metrics and practical thresholds.

---

Latency problems are sneaky. A service might be returning 200 OK responses all day, but if every response takes 10 seconds, your users are having a terrible experience. Setting up latency alerts in Istio catches these performance degradations early, often before users start complaining.

## How Istio Tracks Latency

Istio automatically records request duration for every request passing through the mesh. The metric is `istio_request_duration_milliseconds`, and it is a histogram with configurable buckets. By default, Istio records latency from both the source (client-side) and destination (server-side) perspectives.

The difference matters. Source-side latency includes network time between proxies, while destination-side latency measures the time from the destination proxy to the backend and back. For alerting on user-facing latency, source-side metrics are usually more relevant.

## Choosing the Right Latency Thresholds

Before you configure alerts, you need to figure out what "high latency" means for your services. This varies wildly depending on the service:

- A payment API might need P99 under 500ms
- A search service might need P95 under 200ms
- A batch reporting service might be fine with P99 under 5 seconds

Start by establishing baselines. Query your current latency distribution:

```promql
# P50, P90, P95, P99 for all services
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[1h])) by (le, destination_workload, destination_workload_namespace))

histogram_quantile(0.90, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[1h])) by (le, destination_workload, destination_workload_namespace))

histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[1h])) by (le, destination_workload, destination_workload_namespace))

histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[1h])) by (le, destination_workload, destination_workload_namespace))
```

Run these queries over a week of data to understand your normal patterns, including peak hours.

## Basic Latency Alerts

Here is a straightforward alert configuration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-latency-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-latency
    rules:
    - alert: IstioHighP99Latency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m]))
          by (le, destination_workload, destination_workload_namespace)
        ) > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P99 latency for {{ $labels.destination_workload }}"
        description: "P99 latency is {{ $value }}ms for {{ $labels.destination_workload }} in {{ $labels.destination_workload_namespace }}"
    - alert: IstioHighP95Latency
      expr: |
        histogram_quantile(0.95,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m]))
          by (le, destination_workload, destination_workload_namespace)
        ) > 500
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P95 latency for {{ $labels.destination_workload }}"
        description: "P95 latency is {{ $value }}ms for {{ $labels.destination_workload }} in {{ $labels.destination_workload_namespace }}"
    - alert: IstioHighP50Latency
      expr: |
        histogram_quantile(0.50,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m]))
          by (le, destination_workload, destination_workload_namespace)
        ) > 200
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "High median latency for {{ $labels.destination_workload }}"
        description: "Median latency is {{ $value }}ms for {{ $labels.destination_workload }}. This affects the majority of requests."
```

## Per-Service Latency Alerts

Different services have different latency requirements. You can create targeted alerts for critical services:

```yaml
    - alert: PaymentServiceHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{
            reporter="source",
            destination_workload="payment-service",
            destination_workload_namespace="production"
          }[5m])) by (le)
        ) > 500
      for: 2m
      labels:
        severity: critical
        team: payments
      annotations:
        summary: "Payment service P99 latency above 500ms"
        description: "Current P99: {{ $value }}ms. This directly impacts checkout experience."
```

## Latency Alerts by HTTP Method

Not all requests are equal. GET requests should be fast, while POST requests to heavy endpoints might naturally take longer:

```yaml
    - alert: IstioHighGetLatency
      expr: |
        histogram_quantile(0.95,
          sum(rate(istio_request_duration_milliseconds_bucket{
            reporter="source",
            request_protocol="http",
            response_code!~"5.*"
          }[5m])) by (le, destination_workload, destination_workload_namespace)
        ) > 300
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High read latency for {{ $labels.destination_workload }}"
```

## SLO-Based Latency Alerts

A more sophisticated approach is to alert based on SLO burn rates. Instead of alerting on raw latency, you alert when you are burning through your error budget too quickly:

```yaml
    # Recording rule for SLO tracking
    - record: istio:service:latency_slo_ratio
      expr: |
        sum(rate(istio_request_duration_milliseconds_bucket{reporter="source",le="500"}[5m]))
        by (destination_workload, destination_workload_namespace)
        /
        sum(rate(istio_request_duration_milliseconds_count{reporter="source"}[5m]))
        by (destination_workload, destination_workload_namespace)

    # Fast burn alert (high urgency)
    - alert: IstioLatencySLOFastBurn
      expr: |
        istio:service:latency_slo_ratio < 0.95
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "{{ $labels.destination_workload }} latency SLO fast burn"
        description: "Only {{ $value | humanizePercentage }} of requests are under 500ms. SLO target is 99%."

    # Slow burn alert (lower urgency)
    - alert: IstioLatencySLOSlowBurn
      expr: |
        istio:service:latency_slo_ratio < 0.99
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "{{ $labels.destination_workload }} latency SLO slow burn"
```

## Latency Comparison Alerts

Sometimes absolute thresholds are less useful than detecting relative changes. Alert when latency jumps compared to the previous period:

```yaml
    - alert: IstioLatencySpike
      expr: |
        histogram_quantile(0.95,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m]))
          by (le, destination_workload, destination_workload_namespace)
        )
        >
        2 * histogram_quantile(0.95,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m] offset 1h))
          by (le, destination_workload, destination_workload_namespace)
        )
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Latency spike detected for {{ $labels.destination_workload }}"
        description: "P95 latency has more than doubled compared to 1 hour ago"
```

## Testing Your Latency Alerts

To verify your alerts work, you can introduce artificial latency using Istio fault injection:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: test-latency-alert
  namespace: default
spec:
  hosts:
  - my-service
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 3s
    route:
    - destination:
        host: my-service
```

Apply this, wait for your alert evaluation period, and verify the alert fires. Then remove the VirtualService.

## Routing Alerts to the Right Team

Use alert labels to route notifications appropriately:

```yaml
# Alertmanager config
route:
  group_by: ['alertname', 'destination_workload']
  receiver: default
  routes:
  - match:
      team: payments
    receiver: payments-team-slack
  - match:
      severity: critical
    receiver: oncall-pagerduty

receivers:
- name: payments-team-slack
  slack_configs:
  - channel: '#payments-alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

Latency alerting is one of the most valuable monitoring investments you can make. It directly correlates with user experience, and Istio makes it easy because the metrics are already there. Start with broad thresholds, observe the noise level, and gradually tighten them as you understand your system better.
