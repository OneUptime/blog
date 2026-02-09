# How to Use OpenTelemetry to Measure and Report on SLA Compliance Across Hundreds of Internal Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SLA Compliance, Reporting, Enterprise Observability

Description: Use OpenTelemetry data to automatically measure and report on SLA compliance across hundreds of internal services in your organization.

Measuring SLA compliance for a handful of services is manageable. Doing it across hundreds of internal services requires automation. OpenTelemetry provides the raw signals (traces and metrics) that, when properly processed, can feed an automated SLA compliance reporting system. This post shows how to build one.

## What SLAs Look Like for Internal Services

Internal SLAs typically cover:

- **Availability**: Percentage of successful responses (non-5xx)
- **Latency**: P50, P95, P99 response times
- **Error budget**: Remaining allowance before SLA breach
- **Throughput**: Minimum request capacity

## SLA Definition Format

Define SLAs as structured data:

```yaml
# sla-definitions.yaml
slas:
  - service: payment-api
    tier: critical
    objectives:
      availability:
        target: 99.99
        window: 30d
      latency_p99:
        target_ms: 500
        window: 30d
      latency_p50:
        target_ms: 100
        window: 30d

  - service: catalog-api
    tier: standard
    objectives:
      availability:
        target: 99.9
        window: 30d
      latency_p99:
        target_ms: 2000
        window: 30d

  - service: notification-service
    tier: standard
    objectives:
      availability:
        target: 99.5
        window: 30d
      latency_p99:
        target_ms: 5000
        window: 30d
```

## Generating SLI Metrics from OpenTelemetry Data

Configure the Collector to generate SLI (Service Level Indicator) metrics from trace data:

```yaml
# collector-sli-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: service.name
      - name: http.response.status_code
      - name: http.request.method
    exemplars:
      enabled: true
    namespace: sli

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion:
      enabled: true

  otlphttp:
    endpoint: https://backend:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp, spanmetrics]
    metrics:
      receivers: [spanmetrics]
      processors: [batch]
      exporters: [prometheus]
```

## Prometheus Recording Rules for SLI Calculation

```yaml
# prometheus-sli-rules.yaml
groups:
  - name: sli-calculations
    interval: 1m
    rules:
      # Availability SLI: ratio of successful requests
      - record: sli:availability:ratio_rate5m
        expr: |
          sum by (service_name) (
            rate(sli_calls_total{
              status_code!~"5.."
            }[5m])
          )
          /
          sum by (service_name) (
            rate(sli_calls_total[5m])
          )

      # Latency SLI: P99 latency
      - record: sli:latency_p99:seconds
        expr: |
          histogram_quantile(0.99,
            sum by (service_name, le) (
              rate(sli_duration_milliseconds_bucket[5m])
            )
          ) / 1000

      # Latency SLI: P50 latency
      - record: sli:latency_p50:seconds
        expr: |
          histogram_quantile(0.50,
            sum by (service_name, le) (
              rate(sli_duration_milliseconds_bucket[5m])
            )
          ) / 1000

      # Error budget remaining (30-day rolling window)
      - record: sli:error_budget:remaining
        expr: |
          1 - (
            (1 - avg_over_time(sli:availability:ratio_rate5m[30d]))
            /
            (1 - 0.999)
          )
```

## SLA Compliance Reporter

```python
# sla_reporter.py
import yaml
import requests
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List

PROMETHEUS_URL = "http://prometheus:9090"

@dataclass
class SLAResult:
    service: str
    objective: str
    target: float
    actual: float
    compliant: bool
    error_budget_remaining_pct: float

def query_prometheus(query: str) -> dict:
    """Execute a Prometheus query."""
    resp = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )
    return resp.json()

def check_sla_compliance(sla_def: dict) -> List[SLAResult]:
    """Check SLA compliance for a service."""
    service = sla_def["service"]
    results = []

    objectives = sla_def.get("objectives", {})

    # Check availability
    if "availability" in objectives:
        target = objectives["availability"]["target"]
        window = objectives["availability"]["window"]

        query = (
            f'avg_over_time('
            f'sli:availability:ratio_rate5m{{service_name="{service}"}}'
            f'[{window}]) * 100'
        )
        result = query_prometheus(query)
        actual = 0.0
        if result.get("data", {}).get("result"):
            actual = float(result["data"]["result"][0]["value"][1])

        # Calculate error budget
        allowed_downtime_pct = 100 - target
        actual_downtime_pct = 100 - actual
        if allowed_downtime_pct > 0:
            budget_consumed = actual_downtime_pct / allowed_downtime_pct
            budget_remaining = max(0, (1 - budget_consumed) * 100)
        else:
            budget_remaining = 0 if actual < 100 else 100

        results.append(SLAResult(
            service=service,
            objective="availability",
            target=target,
            actual=round(actual, 4),
            compliant=actual >= target,
            error_budget_remaining_pct=round(budget_remaining, 2),
        ))

    # Check latency P99
    if "latency_p99" in objectives:
        target_ms = objectives["latency_p99"]["target_ms"]
        window = objectives["latency_p99"]["window"]

        query = (
            f'quantile_over_time(0.99, '
            f'sli:latency_p99:seconds{{service_name="{service}"}}'
            f'[{window}]) * 1000'
        )
        result = query_prometheus(query)
        actual_ms = 0.0
        if result.get("data", {}).get("result"):
            actual_ms = float(result["data"]["result"][0]["value"][1])

        results.append(SLAResult(
            service=service,
            objective="latency_p99",
            target=target_ms,
            actual=round(actual_ms, 2),
            compliant=actual_ms <= target_ms,
            error_budget_remaining_pct=max(
                0, (1 - actual_ms / target_ms) * 100
            ) if target_ms > 0 else 0,
        ))

    return results


def generate_report():
    """Generate the full SLA compliance report."""
    with open("sla-definitions.yaml") as f:
        config = yaml.safe_load(f)

    report_date = datetime.utcnow().strftime("%Y-%m-%d")
    print(f"SLA Compliance Report - {report_date}")
    print("=" * 70)

    all_results = []
    for sla in config["slas"]:
        results = check_sla_compliance(sla)
        all_results.extend(results)

        print(f"\nService: {sla['service']} (Tier: {sla['tier']})")
        for r in results:
            status = "PASS" if r.compliant else "FAIL"
            print(f"  [{status}] {r.objective}: "
                  f"target={r.target}, actual={r.actual}, "
                  f"budget_remaining={r.error_budget_remaining_pct}%")

    # Summary
    total = len(all_results)
    compliant = sum(1 for r in all_results if r.compliant)
    print(f"\nSummary: {compliant}/{total} objectives met "
          f"({compliant/total*100:.1f}%)")

    return all_results


if __name__ == "__main__":
    generate_report()
```

## Automated Alerting on SLA Breach Risk

```yaml
# Prometheus alert rules
groups:
  - name: sla-alerts
    rules:
      - alert: SLAErrorBudgetLow
        expr: sli:error_budget:remaining < 0.25
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.service_name }} has less than 25% error budget remaining"

      - alert: SLABreach
        expr: sli:error_budget:remaining <= 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.service_name }} has breached its SLA"
```

## Wrapping Up

OpenTelemetry provides the raw signals needed for automated SLA compliance monitoring. By converting traces into SLI metrics using the Collector's spanmetrics connector, computing compliance with Prometheus recording rules, and generating reports with a Python script, you can monitor SLA compliance across hundreds of services without manual effort. The key is defining SLAs as code and automating every step of the measurement and reporting pipeline.
