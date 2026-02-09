# How to Set Up Error Alerting Policies Based on OpenTelemetry Error Rate Metrics and SLO Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Alerting, SLO, Prometheus

Description: Set up error alerting policies using OpenTelemetry error rate metrics and SLO thresholds for reliable incident detection.

Static error count thresholds are the most common alerting mistake. "Alert when errors exceed 100 per minute" sounds reasonable until your traffic doubles and the threshold fires constantly. SLO-based alerting solves this by expressing thresholds as percentages of your reliability target. This post shows how to build error alerting policies from OpenTelemetry metrics that scale with your traffic.

## Generating Error Rate Metrics

First, set up the OpenTelemetry Collector to generate error rate metrics from spans:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  spanmetrics:
    dimensions:
      - name: service.name
      - name: http.route
      - name: http.method
    metrics_flush_interval: 15s

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

This generates `traces_spanmetrics_calls_total` with a `status_code` label, which is everything you need for error rate calculations.

## Defining Your SLOs

Before you can alert on SLO violations, you need to define your SLOs. Here is a practical example:

```yaml
# slo-definitions.yaml
slos:
  - name: "api-availability"
    service: "api-gateway"
    target: 0.999          # 99.9% of requests succeed
    window: "30d"          # 30-day rolling window
    error_budget: 0.001    # 0.1% of requests can fail

  - name: "payment-success"
    service: "payment-service"
    target: 0.9995         # 99.95% of payments succeed
    window: "30d"
    error_budget: 0.0005

  - name: "search-availability"
    service: "search-service"
    target: 0.995          # 99.5% of searches succeed
    window: "30d"
    error_budget: 0.005
```

## Building Prometheus Recording Rules

Recording rules pre-compute the error rates so your alert queries are fast:

```yaml
# recording-rules.yaml
groups:
  - name: slo-error-rates
    interval: 30s
    rules:
      # 5-minute error rate by service
      - record: slo:error_rate:5m
        expr: |
          sum by (service_name) (
            rate(traces_spanmetrics_calls_total{
              status_code="STATUS_CODE_ERROR"
            }[5m])
          )
          /
          sum by (service_name) (
            rate(traces_spanmetrics_calls_total[5m])
          )

      # 1-hour error rate by service
      - record: slo:error_rate:1h
        expr: |
          sum by (service_name) (
            rate(traces_spanmetrics_calls_total{
              status_code="STATUS_CODE_ERROR"
            }[1h])
          )
          /
          sum by (service_name) (
            rate(traces_spanmetrics_calls_total[1h])
          )

      # 6-hour error rate by service
      - record: slo:error_rate:6h
        expr: |
          sum by (service_name) (
            rate(traces_spanmetrics_calls_total{
              status_code="STATUS_CODE_ERROR"
            }[6h])
          )
          /
          sum by (service_name) (
            rate(traces_spanmetrics_calls_total[6h])
          )
```

## Multi-Window Burn Rate Alerts

The Google SRE approach uses multi-window burn rate alerts. The idea: check a short window for fast-burning incidents and a long window for slow-burning ones. Both windows must exceed the threshold to fire the alert.

```yaml
# alert-rules.yaml
groups:
  - name: slo-burn-rate-alerts
    rules:
      # Critical: Fast burn detected in both 5m and 1h windows
      # This catches sudden spikes that will exhaust the budget quickly
      - alert: SLOBurnRateCritical
        expr: |
          (slo:error_rate:5m{service_name="api-gateway"} / 0.001 > 14.4)
          and
          (slo:error_rate:1h{service_name="api-gateway"} / 0.001 > 14.4)
        for: 2m
        labels:
          severity: critical
          slo: api-availability
        annotations:
          summary: "API Gateway error budget burning at 14.4x rate"
          description: >
            The API Gateway is consuming error budget at 14.4x the
            sustainable rate. At this pace, the entire 30-day budget
            will be exhausted in {{ $value | humanizeDuration }}.
          runbook: "https://wiki.internal/runbooks/api-gateway-slo"

      # Warning: Slow burn detected in 30m and 6h windows
      # This catches gradual degradation that compounds over time
      - alert: SLOBurnRateWarning
        expr: |
          (slo:error_rate:1h{service_name="api-gateway"} / 0.001 > 1)
          and
          (slo:error_rate:6h{service_name="api-gateway"} / 0.001 > 1)
        for: 30m
        labels:
          severity: warning
          slo: api-availability
        annotations:
          summary: "API Gateway error budget consumption unsustainable"
          description: >
            The API Gateway error rate exceeds the SLO target over
            the last 6 hours. If this continues, the error budget
            will be exhausted before the window resets.
```

## Per-Endpoint Alerts

Some endpoints are more important than others. Add per-endpoint alerting for your critical paths:

```yaml
      # Critical endpoint specific alert
      - alert: PaymentEndpointErrorRate
        expr: |
          sum(rate(traces_spanmetrics_calls_total{
            service_name="api-gateway",
            http_route="/api/v1/payments",
            status_code="STATUS_CODE_ERROR"
          }[5m]))
          /
          sum(rate(traces_spanmetrics_calls_total{
            service_name="api-gateway",
            http_route="/api/v1/payments"
          }[5m]))
          > 0.01
        for: 3m
        labels:
          severity: critical
          endpoint: payments
        annotations:
          summary: "Payment endpoint error rate above 1%"
```

## Configuring Alert Routing

Route different severities to different channels:

```yaml
# alertmanager-config.yaml
route:
  receiver: "default"
  routes:
    - match:
        severity: critical
      receiver: "pagerduty"
      continue: true
    - match:
        severity: warning
      receiver: "slack-warnings"

receivers:
  - name: "pagerduty"
    pagerduty_configs:
      - routing_key: "your-pagerduty-key"
        severity: critical

  - name: "slack-warnings"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/your/webhook/url"
        channel: "#sre-warnings"
        title: "SLO Warning: {{ .GroupLabels.slo }}"
        text: "{{ .CommonAnnotations.description }}"

  - name: "default"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/your/webhook/url"
        channel: "#alerts"
```

## Testing Your Alerts

Before relying on these alerts in production, test them with synthetic errors:

```python
# inject_errors.py - Temporarily inject errors to test alerting
import requests
import time

def inject_test_errors(target_url, count=100, delay=0.1):
    """Send requests that will trigger errors to test alerting."""
    print(f"Injecting {count} error-inducing requests...")
    for i in range(count):
        try:
            # Hit an endpoint that returns 500
            requests.get(f"{target_url}/api/test-error")
        except Exception:
            pass
        time.sleep(delay)
    print("Injection complete. Check alerts in 2-5 minutes.")
```

## Conclusion

SLO-based alerting built on OpenTelemetry error rate metrics gives you alerts that scale with traffic and reflect actual user impact. Multi-window burn rate alerts catch both sudden spikes and slow degradation. Combined with per-endpoint alerting for critical paths, this approach significantly reduces false positives while ensuring real incidents get noticed.
