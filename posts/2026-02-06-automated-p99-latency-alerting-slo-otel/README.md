# How to Set Up Automated Performance Alerting When P99 Latency Exceeds SLO Targets Using OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, P99 Latency, SLO, Alerting, Performance Monitoring

Description: Set up automated alerting that triggers when P99 latency exceeds your SLO targets using OpenTelemetry metrics and multi-window burn rate detection.

Service Level Objectives (SLOs) define the performance your users expect. When your P99 latency exceeds the SLO target, you need to know immediately, not when a customer files a support ticket. But simple threshold alerts create too much noise. A brief 30-second spike should not page someone at 3 AM. You need alerting that distinguishes between real SLO violations and normal variance.

This post covers how to set up intelligent P99 latency alerting using OpenTelemetry metrics with multi-window burn rate detection.

## Defining Your SLO

Start by formalizing your SLO. A P99 latency SLO specifies that 99% of requests must complete within a certain duration over a given time window:

```yaml
# slo-definitions.yaml
slos:
  - name: "api-latency-slo"
    service: "api-service"
    description: "99th percentile latency must stay under 500ms"
    indicator:
      type: "latency"
      percentile: 0.99
      threshold_ms: 500
    objective: 0.995  # 99.5% of time windows must meet the P99 target
    window: "30d"     # measured over a rolling 30-day window
    routes:
      - "/api/orders"
      - "/api/products"
      - "/api/users"
```

## Instrumenting for SLO Measurement

Make sure your application emits latency histograms with enough bucket granularity around the SLO boundary:

```python
# slo_metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

exporter = OTLPMetricExporter(endpoint="otel-collector:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("api-service")

# Create a histogram with bucket boundaries focused around the SLO threshold (500ms)
# More buckets near the threshold give better percentile accuracy
request_duration = meter.create_histogram(
    "http.server.request.duration",
    unit="s",
    description="HTTP request duration",
)

# Also track a counter specifically for SLO violation detection
# This records whether each request met or violated the latency target
slo_violation_counter = meter.create_counter(
    "slo.latency.violations",
    description="Count of requests that violated the latency SLO",
)
slo_total_counter = meter.create_counter(
    "slo.latency.total",
    description="Total requests evaluated against latency SLO",
)

SLO_THRESHOLD_SECONDS = 0.5  # 500ms

def record_request(route, duration_seconds, status_code):
    """Record a request and evaluate it against the SLO."""
    attrs = {"http.route": route, "http.status_code": str(status_code)}

    request_duration.record(duration_seconds, attrs)
    slo_total_counter.add(1, {"http.route": route})

    if duration_seconds > SLO_THRESHOLD_SECONDS:
        slo_violation_counter.add(1, {"http.route": route})
```

## Multi-Window Burn Rate Alerting

Simple threshold alerts (fire when P99 > 500ms) generate too many false positives. The industry best practice is multi-window burn rate alerting, as described in Google's SRE book. The idea is to alert when the error budget is being consumed at a rate that will exhaust it before the window ends.

```yaml
# alerting-rules.yaml
groups:
  - name: slo-burn-rate-alerts
    rules:
      # Calculate the error ratio: fraction of requests violating the latency SLO
      - record: slo:latency:error_ratio_1h
        expr: |
          sum(rate(slo_latency_violations_total[1h])) by (http_route)
          /
          sum(rate(slo_latency_total_total[1h])) by (http_route)

      - record: slo:latency:error_ratio_6h
        expr: |
          sum(rate(slo_latency_violations_total[6h])) by (http_route)
          /
          sum(rate(slo_latency_total_total[6h])) by (http_route)

      - record: slo:latency:error_ratio_1d
        expr: |
          sum(rate(slo_latency_violations_total[1d])) by (http_route)
          /
          sum(rate(slo_latency_total_total[1d])) by (http_route)

      - record: slo:latency:error_ratio_3d
        expr: |
          sum(rate(slo_latency_violations_total[3d])) by (http_route)
          /
          sum(rate(slo_latency_total_total[3d])) by (http_route)

      # Fast burn: consuming error budget 14x faster than allowed
      # Alert if both 1h AND 5m windows show fast burn
      - alert: SLOLatencyFastBurn
        expr: |
          slo:latency:error_ratio_1h > (14.4 * 0.005)
          and
          sum(rate(slo_latency_violations_total[5m])) by (http_route)
          / sum(rate(slo_latency_total_total[5m])) by (http_route)
          > (14.4 * 0.005)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "P99 latency SLO burning fast for {{ $labels.http_route }}"
          description: "Error budget is being consumed at 14x the sustainable rate"

      # Slow burn: consuming error budget 3x faster than allowed
      - alert: SLOLatencySlowBurn
        expr: |
          slo:latency:error_ratio_1d > (3 * 0.005)
          and
          slo:latency:error_ratio_6h > (3 * 0.005)
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "P99 latency SLO slowly degrading for {{ $labels.http_route }}"
          description: "Error budget is being consumed at 3x the sustainable rate"
```

## Error Budget Tracking Dashboard

Build a dashboard that shows how much error budget remains:

```promql
# Error budget remaining (as a percentage)
# Budget = 0.5% of requests can violate P99 over 30 days
1 - (
  sum(increase(slo_latency_violations_total[30d])) by (http_route)
  /
  sum(increase(slo_latency_total_total[30d])) by (http_route)
) / 0.005

# Current P99 latency (should be below SLO threshold)
histogram_quantile(0.99,
  sum(rate(http_server_request_duration_seconds_bucket[5m])) by (le, http_route)
)

# Error budget burn rate (1 = sustainable, >1 = burning too fast)
(
  sum(rate(slo_latency_violations_total[1h])) by (http_route)
  / sum(rate(slo_latency_total_total[1h])) by (http_route)
)
/ 0.005
```

## Integrating with Incident Response

When an alert fires, automatically create an incident with context:

```python
# slo_alert_handler.py
import requests
import json
import os

ONEUPTIME_API = os.environ.get("ONEUPTIME_API_URL")
ONEUPTIME_API_KEY = os.environ.get("ONEUPTIME_API_KEY")

def handle_slo_alert(alert_data):
    """Handle an SLO alert by creating an incident with full context."""
    route = alert_data.get("labels", {}).get("http_route", "unknown")
    severity = alert_data.get("labels", {}).get("severity", "warning")
    burn_rate = alert_data.get("annotations", {}).get("description", "")

    # Query for the current P99 value
    current_p99 = query_current_p99(route)

    # Query for error budget remaining
    budget_remaining = query_error_budget(route)

    incident = {
        "title": f"P99 Latency SLO Violation: {route}",
        "description": (
            f"The P99 latency SLO for {route} is being violated.\n\n"
            f"Current P99: {current_p99:.0f}ms (target: 500ms)\n"
            f"Error budget remaining: {budget_remaining:.1f}%\n"
            f"Burn rate: {burn_rate}\n\n"
            f"Investigate the traces for {route} to identify the root cause."
        ),
        "severity": severity,
    }

    resp = requests.post(
        f"{ONEUPTIME_API}/incidents",
        headers={"Authorization": f"Bearer {ONEUPTIME_API_KEY}"},
        json=incident,
    )
    print(f"Created incident: {resp.json().get('id')}")
```

## Tuning Your Alerts

The burn rate multipliers (14.4x for fast burn, 3x for slow burn) and the time windows need tuning for your specific environment. Start with the defaults from Google's SRE book and adjust based on experience.

If you get too many false positive alerts, increase the `for` duration (how long the condition must hold before firing). If you miss real incidents, lower the burn rate multiplier.

Track the alert-to-incident ratio. A good SLO alerting setup should have at least 80% of alerts correspond to real user-impacting issues. If you are below that, your thresholds need adjustment.

## Wrapping Up

SLO-based alerting on P99 latency is a significant upgrade over simple threshold alerts. By using multi-window burn rate detection with OpenTelemetry metrics, you get alerts that are both timely and accurate. Fast burns page on-call immediately, slow burns create warnings for business hours investigation, and brief spikes are ignored. Combined with error budget tracking, this gives your team a clear, quantitative understanding of how your service is performing relative to user expectations.
