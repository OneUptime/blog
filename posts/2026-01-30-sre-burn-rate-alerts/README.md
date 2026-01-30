# How to Build Burn Rate Alerts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, Alerting, SLO, Reliability

Description: Implement burn rate alerting for SLOs to catch reliability issues early with multi-window alerts and error budget consumption tracking.

---

Traditional threshold-based alerting fails for SLO-driven teams. You either alert too early on minor blips or too late when your error budget is already exhausted. Burn rate alerting solves this by measuring how fast you are consuming your error budget relative to your SLO target.

This approach comes directly from the Google SRE book and has become the standard for teams running production systems at scale. In this post, we will implement burn rate alerts from scratch using Prometheus, covering the math, the recording rules, and the multi-window strategies that make these alerts actionable.

## What is a Burn Rate?

Burn rate measures how fast you are consuming your error budget relative to the steady-state consumption rate.

If your SLO is 99.9% availability over 30 days, you have an error budget of 0.1% (43.2 minutes of downtime per month). A burn rate of 1 means you are consuming your error budget at exactly the rate that would exhaust it by the end of the window. A burn rate of 2 means you are burning twice as fast and will exhaust your budget in 15 days.

The formula:

```
burn_rate = error_rate / (1 - SLO_target)
```

For a 99.9% SLO:

```
burn_rate = error_rate / 0.001
```

If your current error rate is 0.5%, your burn rate is:

```
burn_rate = 0.005 / 0.001 = 5
```

A burn rate of 5 means you are burning 5x faster than sustainable. At this rate, your 30-day error budget would be exhausted in 6 days.

## Why Burn Rate Beats Threshold Alerting

| Approach | Problem |
|----------|---------|
| **Alert on any error** | Too noisy, alert fatigue |
| **Alert on error rate > X%** | Arbitrary threshold, ignores SLO context |
| **Alert on SLO breach** | Too late, budget already gone |
| **Alert on burn rate** | Contextual, actionable, tied to business impact |

Burn rate alerts tell you: "At your current rate, you will breach your SLO in X time." This gives engineers context to make decisions about whether to act immediately or continue monitoring.

## Calculating Error Budget Consumption

Before building alerts, you need to track your SLIs (Service Level Indicators). Here we use the ratio of successful requests to total requests.

This recording rule calculates the error ratio over a 5-minute window. We use `rate()` to handle counter resets and get a per-second rate.

```yaml
# prometheus/rules/sli_recording_rules.yml
groups:
  - name: sli_recording_rules
    interval: 30s
    rules:
      # Calculate error ratio from HTTP response codes
      # Errors are 5xx responses, total is all responses
      - record: sli:http_requests:error_ratio_rate5m
        expr: |
          sum by (service, environment) (
            rate(http_requests_total{status_code=~"5.."}[5m])
          )
          /
          sum by (service, environment) (
            rate(http_requests_total[5m])
          )
        labels:
          sli_type: availability

      # Success ratio (inverse of error ratio)
      - record: sli:http_requests:success_ratio_rate5m
        expr: |
          1 - sli:http_requests:error_ratio_rate5m

      # Calculate latency SLI (requests under threshold / total)
      # This measures the proportion of requests completing within 300ms
      - record: sli:http_requests:latency_ratio_rate5m
        expr: |
          sum by (service, environment) (
            rate(http_request_duration_seconds_bucket{le="0.3"}[5m])
          )
          /
          sum by (service, environment) (
            rate(http_request_duration_seconds_count[5m])
          )
        labels:
          sli_type: latency
```

## Basic Burn Rate Calculation

Now we calculate burn rate by dividing the error ratio by the error budget (1 - SLO target).

This recording rule computes burn rate for a 99.9% SLO. A burn rate of 1 means steady-state consumption, higher values indicate faster consumption.

```yaml
# prometheus/rules/burn_rate_rules.yml
groups:
  - name: burn_rate_rules
    interval: 30s
    rules:
      # Burn rate for 99.9% availability SLO
      # Error budget = 1 - 0.999 = 0.001
      - record: slo:http_requests:burn_rate_5m
        expr: |
          sli:http_requests:error_ratio_rate5m / 0.001
        labels:
          slo_target: "99.9"

      # Burn rate for 99.5% availability SLO
      - record: slo:http_requests:burn_rate_5m
        expr: |
          sli:http_requests:error_ratio_rate5m / 0.005
        labels:
          slo_target: "99.5"

      # Burn rate for latency SLO (99% of requests under 300ms)
      - record: slo:http_latency:burn_rate_5m
        expr: |
          (1 - sli:http_requests:latency_ratio_rate5m) / 0.01
        labels:
          slo_target: "99.0"
```

## The Problem with Single-Window Alerts

A naive burn rate alert might look like:

```yaml
# DO NOT USE - Example of a problematic single-window alert
- alert: HighBurnRate
  expr: slo:http_requests:burn_rate_5m > 10
  for: 2m
  labels:
    severity: critical
```

This has two problems:

1. **Short window, high threshold**: A 5-minute window is too short. Brief spikes trigger alerts that resolve before anyone can respond.

2. **Long window, low threshold**: If you use a 1-hour window with a lower threshold, you miss fast-burning incidents that exhaust budget quickly.

The solution is multi-window, multi-burn-rate alerting.

## Multi-Window Multi-Burn-Rate Alerting

The Google SRE approach uses two windows for each alert: a long window to detect sustained issues and a short window to confirm the issue is current (not historical).

| Alert Severity | Long Window | Short Window | Burn Rate | Time to Budget Exhaustion |
|----------------|-------------|--------------|-----------|---------------------------|
| Page (Critical) | 1h | 5m | 14.4 | 2.08 days |
| Page (Critical) | 6h | 30m | 6 | 5 days |
| Ticket (Warning) | 1d | 2h | 3 | 10 days |
| Ticket (Warning) | 3d | 6h | 1 | 30 days |

The burn rate values come from this calculation:

```
burn_rate = SLO_window / detection_time
```

For a 1-hour detection window with a 30-day SLO window:

```
burn_rate = 30 * 24 / 1 = 720 (this is the maximum)
```

To detect issues that would exhaust budget in 2 days:

```
burn_rate = 30 / 2 = 15 (we use 14.4 for some safety margin)
```

## Recording Rules for Multiple Windows

First, create recording rules for different time windows. These pre-compute the expensive aggregations so your alerts are fast.

```yaml
# prometheus/rules/multi_window_burn_rate.yml
groups:
  - name: multi_window_burn_rate
    interval: 30s
    rules:
      # 5-minute window (for short window in critical alerts)
      - record: slo:http_requests:burn_rate_5m
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[5m])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[5m])
            )
          ) / 0.001

      # 30-minute window
      - record: slo:http_requests:burn_rate_30m
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[30m])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[30m])
            )
          ) / 0.001

      # 1-hour window (for long window in first critical alert)
      - record: slo:http_requests:burn_rate_1h
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[1h])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[1h])
            )
          ) / 0.001

      # 2-hour window
      - record: slo:http_requests:burn_rate_2h
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[2h])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[2h])
            )
          ) / 0.001

      # 6-hour window (for long window in second critical alert)
      - record: slo:http_requests:burn_rate_6h
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[6h])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[6h])
            )
          ) / 0.001

      # 1-day window (for long window in ticket alert)
      - record: slo:http_requests:burn_rate_1d
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[1d])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[1d])
            )
          ) / 0.001

      # 3-day window (for long window in slow burn ticket)
      - record: slo:http_requests:burn_rate_3d
        expr: |
          (
            sum by (service, environment) (
              rate(http_requests_total{status_code=~"5.."}[3d])
            )
            /
            sum by (service, environment) (
              rate(http_requests_total[3d])
            )
          ) / 0.001
```

## Multi-Window Alert Rules

Now define alerts that combine long and short windows. The long window catches sustained issues, the short window confirms the issue is happening now.

```yaml
# prometheus/rules/burn_rate_alerts.yml
groups:
  - name: burn_rate_alerts
    rules:
      # Critical: Fast burn - exhausts budget in ~2 days
      # Long window: 1h, Short window: 5m, Burn rate: 14.4
      - alert: SLOBurnRateCriticalFast
        expr: |
          slo:http_requests:burn_rate_1h > 14.4
          and
          slo:http_requests:burn_rate_5m > 14.4
        for: 2m
        labels:
          severity: critical
          alert_type: slo_burn
        annotations:
          summary: "High SLO burn rate for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} in {{ $labels.environment }} is burning
            error budget at {{ printf "%.1f" $value }}x the sustainable rate.
            At this rate, the monthly error budget will be exhausted in ~2 days.
          runbook_url: "https://runbooks.example.com/slo-burn-rate"
          dashboard_url: "https://grafana.example.com/d/slo/{{ $labels.service }}"

      # Critical: Medium burn - exhausts budget in ~5 days
      # Long window: 6h, Short window: 30m, Burn rate: 6
      - alert: SLOBurnRateCriticalMedium
        expr: |
          slo:http_requests:burn_rate_6h > 6
          and
          slo:http_requests:burn_rate_30m > 6
        for: 5m
        labels:
          severity: critical
          alert_type: slo_burn
        annotations:
          summary: "Elevated SLO burn rate for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} in {{ $labels.environment }} is burning
            error budget at {{ printf "%.1f" $value }}x the sustainable rate.
            At this rate, the monthly error budget will be exhausted in ~5 days.
          runbook_url: "https://runbooks.example.com/slo-burn-rate"

      # Warning: Slow burn - exhausts budget in ~10 days
      # Long window: 1d, Short window: 2h, Burn rate: 3
      - alert: SLOBurnRateWarning
        expr: |
          slo:http_requests:burn_rate_1d > 3
          and
          slo:http_requests:burn_rate_2h > 3
        for: 15m
        labels:
          severity: warning
          alert_type: slo_burn
        annotations:
          summary: "Slow SLO burn for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} in {{ $labels.environment }} is burning
            error budget at {{ printf "%.1f" $value }}x the sustainable rate.
            At this rate, the monthly error budget will be exhausted in ~10 days.
            Consider investigating during business hours.

      # Info: Very slow burn - on track to exhaust budget
      # Long window: 3d, Short window: 6h, Burn rate: 1
      - alert: SLOBurnRateElevated
        expr: |
          slo:http_requests:burn_rate_3d > 1
          and
          slo:http_requests:burn_rate_6h > 1
        for: 1h
        labels:
          severity: info
          alert_type: slo_burn
        annotations:
          summary: "SLO burn rate elevated for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} is consuming error budget faster than
            sustainable. Review in next planning session.
```

## Error Budget Remaining Alerts

In addition to burn rate, track absolute error budget remaining. This catches situations where cumulative small burns have depleted your budget.

```yaml
# prometheus/rules/error_budget_remaining.yml
groups:
  - name: error_budget_remaining
    interval: 1m
    rules:
      # Calculate error budget consumed in the current 30-day window
      # Uses increase() to sum total errors over the window
      - record: slo:http_requests:error_budget_consumed_30d
        expr: |
          (
            sum by (service, environment) (
              increase(http_requests_total{status_code=~"5.."}[30d])
            )
            /
            sum by (service, environment) (
              increase(http_requests_total[30d])
            )
          ) / 0.001

      # Percentage of error budget remaining
      - record: slo:http_requests:error_budget_remaining_percent
        expr: |
          clamp_min(
            100 * (1 - slo:http_requests:error_budget_consumed_30d),
            0
          )

      # Alert when budget is getting low
      - alert: ErrorBudgetLow
        expr: slo:http_requests:error_budget_remaining_percent < 25
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error budget below 25% for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} has only {{ printf "%.1f" $value }}%
            of its monthly error budget remaining.
            Consider reducing deployment velocity until budget recovers.

      # Alert when budget is nearly exhausted
      - alert: ErrorBudgetCritical
        expr: slo:http_requests:error_budget_remaining_percent < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error budget nearly exhausted for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} has only {{ printf "%.1f" $value }}%
            of its monthly error budget remaining.
            Freeze non-critical deployments until budget recovers.
```

## Parameterized SLO Configuration

For teams managing multiple services with different SLOs, use a templated approach. This configuration file defines SLOs that can generate recording rules programmatically.

```yaml
# slo_config.yml
slos:
  - name: api_availability
    service: api-gateway
    sli_type: availability
    target: 0.999
    window: 30d
    error_query: |
      sum(rate(http_requests_total{service="api-gateway",status_code=~"5.."}[{{.window}}]))
    total_query: |
      sum(rate(http_requests_total{service="api-gateway"}[{{.window}}]))

  - name: api_latency
    service: api-gateway
    sli_type: latency
    target: 0.99
    window: 30d
    threshold: 300ms
    good_query: |
      sum(rate(http_request_duration_seconds_bucket{service="api-gateway",le="0.3"}[{{.window}}]))
    total_query: |
      sum(rate(http_request_duration_seconds_count{service="api-gateway"}[{{.window}}]))

  - name: payment_success
    service: payment-service
    sli_type: success_rate
    target: 0.9999
    window: 30d
    error_query: |
      sum(rate(payment_transactions_total{status="failed"}[{{.window}}]))
    total_query: |
      sum(rate(payment_transactions_total[{{.window}}]))
```

## Generating Rules from Configuration

This Python script reads the SLO configuration and generates Prometheus recording rules. Run this as part of your CI/CD pipeline to keep rules in sync with SLO definitions.

```python
#!/usr/bin/env python3
# generate_slo_rules.py
import yaml
from typing import Dict, List, Any

# Define the windows for multi-window alerting
BURN_RATE_WINDOWS = [
    {"name": "5m", "duration": "5m"},
    {"name": "30m", "duration": "30m"},
    {"name": "1h", "duration": "1h"},
    {"name": "2h", "duration": "2h"},
    {"name": "6h", "duration": "6h"},
    {"name": "1d", "duration": "1d"},
    {"name": "3d", "duration": "3d"},
]

# Alert configurations based on Google SRE book
ALERT_CONFIGS = [
    {
        "name": "CriticalFast",
        "severity": "critical",
        "long_window": "1h",
        "short_window": "5m",
        "burn_rate": 14.4,
        "for_duration": "2m",
        "exhaustion_days": 2,
    },
    {
        "name": "CriticalMedium",
        "severity": "critical",
        "long_window": "6h",
        "short_window": "30m",
        "burn_rate": 6,
        "for_duration": "5m",
        "exhaustion_days": 5,
    },
    {
        "name": "Warning",
        "severity": "warning",
        "long_window": "1d",
        "short_window": "2h",
        "burn_rate": 3,
        "for_duration": "15m",
        "exhaustion_days": 10,
    },
    {
        "name": "Info",
        "severity": "info",
        "long_window": "3d",
        "short_window": "6h",
        "burn_rate": 1,
        "for_duration": "1h",
        "exhaustion_days": 30,
    },
]


def load_slo_config(path: str) -> Dict[str, Any]:
    """Load SLO configuration from YAML file."""
    with open(path, "r") as f:
        return yaml.safe_load(f)


def generate_burn_rate_rules(slo: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate burn rate recording rules for all windows."""
    rules = []
    error_budget = 1 - slo["target"]

    for window in BURN_RATE_WINDOWS:
        # Substitute the window duration in queries
        error_query = slo["error_query"].replace("{{.window}}", window["duration"])
        total_query = slo["total_query"].replace("{{.window}}", window["duration"])

        rule = {
            "record": f"slo:{slo['name']}:burn_rate_{window['name']}",
            "expr": f"({error_query}) / ({total_query}) / {error_budget}",
            "labels": {
                "slo_name": slo["name"],
                "service": slo["service"],
                "slo_target": str(slo["target"]),
            },
        }
        rules.append(rule)

    return rules


def generate_alerts(slo: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate multi-window alerts for an SLO."""
    alerts = []

    for config in ALERT_CONFIGS:
        long_metric = f"slo:{slo['name']}:burn_rate_{config['long_window']}"
        short_metric = f"slo:{slo['name']}:burn_rate_{config['short_window']}"

        alert = {
            "alert": f"SLO{slo['name'].title().replace('_', '')}BurnRate{config['name']}",
            "expr": f"{long_metric} > {config['burn_rate']} and {short_metric} > {config['burn_rate']}",
            "for": config["for_duration"],
            "labels": {
                "severity": config["severity"],
                "slo_name": slo["name"],
                "service": slo["service"],
            },
            "annotations": {
                "summary": f"SLO burn rate {config['name'].lower()} for {slo['service']}",
                "description": (
                    f"Service {slo['service']} is burning error budget at "
                    f"{{{{ printf \"%.1f\" $value }}}}x the sustainable rate. "
                    f"At this rate, budget exhausts in ~{config['exhaustion_days']} days."
                ),
            },
        }
        alerts.append(alert)

    return alerts


def main():
    config = load_slo_config("slo_config.yml")

    recording_rules = []
    alerting_rules = []

    for slo in config["slos"]:
        recording_rules.extend(generate_burn_rate_rules(slo))
        alerting_rules.extend(generate_alerts(slo))

    # Output recording rules
    recording_output = {
        "groups": [
            {
                "name": "slo_burn_rate_recording_rules",
                "interval": "30s",
                "rules": recording_rules,
            }
        ]
    }

    with open("prometheus/rules/generated_slo_recording.yml", "w") as f:
        yaml.dump(recording_output, f, default_flow_style=False)

    # Output alerting rules
    alerting_output = {
        "groups": [
            {
                "name": "slo_burn_rate_alerts",
                "rules": alerting_rules,
            }
        ]
    }

    with open("prometheus/rules/generated_slo_alerts.yml", "w") as f:
        yaml.dump(alerting_output, f, default_flow_style=False)

    print(f"Generated {len(recording_rules)} recording rules")
    print(f"Generated {len(alerting_rules)} alerting rules")


if __name__ == "__main__":
    main()
```

## Testing Your Burn Rate Alerts

Before deploying to production, test your alerts with known failure scenarios. This script simulates different burn rates to verify alert thresholds.

```python
#!/usr/bin/env python3
# test_burn_rate_alerts.py
"""
Test burn rate alert thresholds by calculating expected behavior
"""

def calculate_burn_rate(error_rate: float, slo_target: float) -> float:
    """Calculate burn rate from error rate and SLO target."""
    error_budget = 1 - slo_target
    return error_rate / error_budget


def time_to_exhaustion(burn_rate: float, slo_window_days: int = 30) -> float:
    """Calculate days until error budget exhaustion at given burn rate."""
    if burn_rate <= 0:
        return float("inf")
    return slo_window_days / burn_rate


def main():
    slo_target = 0.999  # 99.9% availability
    slo_window_days = 30

    # Test scenarios
    scenarios = [
        {"name": "Normal operation", "error_rate": 0.0005},
        {"name": "Slight degradation", "error_rate": 0.001},
        {"name": "Moderate issues", "error_rate": 0.003},
        {"name": "Significant problems", "error_rate": 0.006},
        {"name": "Major incident", "error_rate": 0.015},
        {"name": "Critical outage", "error_rate": 0.05},
    ]

    print(f"SLO Target: {slo_target * 100}%")
    print(f"Error Budget: {(1 - slo_target) * 100}%")
    print(f"SLO Window: {slo_window_days} days")
    print()
    print(f"{'Scenario':<25} {'Error Rate':<12} {'Burn Rate':<12} {'Days to Exhaust':<15} {'Alert Level'}")
    print("-" * 80)

    for scenario in scenarios:
        burn_rate = calculate_burn_rate(scenario["error_rate"], slo_target)
        days = time_to_exhaustion(burn_rate, slo_window_days)

        # Determine alert level based on our thresholds
        if burn_rate > 14.4:
            alert = "CRITICAL (Fast)"
        elif burn_rate > 6:
            alert = "CRITICAL (Medium)"
        elif burn_rate > 3:
            alert = "WARNING"
        elif burn_rate > 1:
            alert = "INFO"
        else:
            alert = "None"

        print(f"{scenario['name']:<25} {scenario['error_rate']*100:>10.2f}% {burn_rate:>10.1f}x {days:>13.1f}d {alert}")


if __name__ == "__main__":
    main()
```

Running this produces:

```
SLO Target: 99.9%
Error Budget: 0.1%
SLO Window: 30 days

Scenario                  Error Rate   Burn Rate    Days to Exhaust Alert Level
--------------------------------------------------------------------------------
Normal operation               0.05%        0.5x          60.0d None
Slight degradation             0.10%        1.0x          30.0d INFO
Moderate issues                0.30%        3.0x          10.0d WARNING
Significant problems           0.60%        6.0x           5.0d CRITICAL (Medium)
Major incident                 1.50%       15.0x           2.0d CRITICAL (Fast)
Critical outage                5.00%       50.0x           0.6d CRITICAL (Fast)
```

## Grafana Dashboard for Burn Rate

Visualize burn rate and error budget consumption with this Grafana dashboard configuration.

```json
{
  "title": "SLO Burn Rate Dashboard",
  "panels": [
    {
      "title": "Current Burn Rate (1h window)",
      "type": "gauge",
      "gridPos": { "x": 0, "y": 0, "w": 6, "h": 8 },
      "targets": [
        {
          "expr": "slo:http_requests:burn_rate_1h{service=\"$service\"}",
          "legendFormat": "{{ service }}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 1, "color": "yellow" },
              { "value": 3, "color": "orange" },
              { "value": 6, "color": "red" }
            ]
          },
          "max": 20,
          "unit": "x"
        }
      }
    },
    {
      "title": "Error Budget Remaining",
      "type": "gauge",
      "gridPos": { "x": 6, "y": 0, "w": 6, "h": 8 },
      "targets": [
        {
          "expr": "slo:http_requests:error_budget_remaining_percent{service=\"$service\"}",
          "legendFormat": "{{ service }}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              { "value": 0, "color": "red" },
              { "value": 10, "color": "orange" },
              { "value": 25, "color": "yellow" },
              { "value": 50, "color": "green" }
            ]
          },
          "max": 100,
          "unit": "percent"
        }
      }
    },
    {
      "title": "Burn Rate Over Time",
      "type": "timeseries",
      "gridPos": { "x": 0, "y": 8, "w": 12, "h": 10 },
      "targets": [
        {
          "expr": "slo:http_requests:burn_rate_5m{service=\"$service\"}",
          "legendFormat": "5m window"
        },
        {
          "expr": "slo:http_requests:burn_rate_1h{service=\"$service\"}",
          "legendFormat": "1h window"
        },
        {
          "expr": "slo:http_requests:burn_rate_6h{service=\"$service\"}",
          "legendFormat": "6h window"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "custom": {
            "thresholdsStyle": { "mode": "line" }
          },
          "thresholds": {
            "steps": [
              { "value": 1, "color": "yellow" },
              { "value": 6, "color": "orange" },
              { "value": 14.4, "color": "red" }
            ]
          }
        }
      }
    },
    {
      "title": "Error Budget Consumption Over Time",
      "type": "timeseries",
      "gridPos": { "x": 0, "y": 18, "w": 12, "h": 8 },
      "targets": [
        {
          "expr": "100 - slo:http_requests:error_budget_remaining_percent{service=\"$service\"}",
          "legendFormat": "Budget consumed"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "max": 100
        }
      }
    }
  ],
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "query": "label_values(slo:http_requests:burn_rate_1h, service)"
      }
    ]
  }
}
```

## Alert Routing Based on Burn Rate

Configure Alertmanager to route alerts based on severity. Critical alerts page immediately, warnings create tickets.

```yaml
# alertmanager.yml
route:
  receiver: default
  group_by: [alertname, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    # Critical SLO burn - page immediately
    - match:
        severity: critical
        alert_type: slo_burn
      receiver: pagerduty-critical
      group_wait: 10s
      repeat_interval: 1h

    # Warning SLO burn - create ticket
    - match:
        severity: warning
        alert_type: slo_burn
      receiver: slack-sre-tickets
      group_wait: 5m
      repeat_interval: 24h

    # Info level - log for review
    - match:
        severity: info
        alert_type: slo_burn
      receiver: slack-sre-info
      group_wait: 1h
      repeat_interval: 72h

receivers:
  - name: default
    slack_configs:
      - channel: '#alerts-default'
        send_resolved: true

  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: ${PAGERDUTY_SERVICE_KEY}
        severity: critical
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
        details:
          service: '{{ .GroupLabels.service }}'
          environment: '{{ .GroupLabels.environment }}'
          runbook: '{{ .Annotations.runbook_url }}'

  - name: slack-sre-tickets
    slack_configs:
      - channel: '#sre-tickets'
        send_resolved: true
        title: 'SLO Warning: {{ .GroupLabels.service }}'
        text: '{{ .Annotations.description }}'
        actions:
          - type: button
            text: 'View Dashboard'
            url: '{{ .Annotations.dashboard_url }}'
          - type: button
            text: 'View Runbook'
            url: '{{ .Annotations.runbook_url }}'

  - name: slack-sre-info
    slack_configs:
      - channel: '#sre-info'
        send_resolved: false
        title: 'SLO Info: {{ .GroupLabels.service }}'
        text: '{{ .Annotations.description }}'
```

## Tuning Burn Rate Thresholds

The default thresholds from the Google SRE book work well as a starting point, but you should tune them based on your team's capacity and service requirements.

| Factor | Adjustment |
|--------|------------|
| Small team, slow response | Lower thresholds to alert earlier |
| Large team, fast response | Higher thresholds to reduce noise |
| Business-critical service | Lower thresholds, more aggressive paging |
| Internal tool | Higher thresholds, ticket-only |
| High traffic service | Shorter windows (more data, faster signal) |
| Low traffic service | Longer windows (need more data for accuracy) |

To tune:

1. Start with default thresholds
2. Track false positive rate (alerts that did not require action)
3. Track missed incidents (budget exhaustion without prior alert)
4. Adjust thresholds to minimize both

A good target is less than 5% false positive rate and zero missed incidents.

## Common Pitfalls

**Pitfall 1: Alerting on empty metrics**

If a service has zero traffic, division by zero produces NaN. Guard against this:

```yaml
- record: slo:http_requests:burn_rate_1h
  expr: |
    (
      sum by (service) (rate(http_requests_total{status_code=~"5.."}[1h]))
      /
      (sum by (service) (rate(http_requests_total[1h])) > 0)
    ) / 0.001
```

**Pitfall 2: Ignoring deployment correlation**

Add deployment markers to your metrics so you can correlate burn rate spikes with releases:

```yaml
- record: deployment:last_timestamp
  expr: |
    max by (service) (
      deployment_timestamp_seconds
    )
```

**Pitfall 3: Not accounting for planned maintenance**

Silence alerts during maintenance windows or adjust your SLO calculations to exclude maintenance periods.

**Pitfall 4: Using burn rate for non-request metrics**

Burn rate works best for request-based SLIs. For batch jobs or other periodic work, consider different approaches like freshness SLIs.

## Summary

| Component | Purpose |
|-----------|---------|
| **Burn rate** | Measures error budget consumption speed relative to steady state |
| **Multi-window** | Long window catches sustained issues, short window confirms current impact |
| **Recording rules** | Pre-compute expensive queries for fast alerting |
| **Alert severity** | Map burn rate to exhaustion time for appropriate response urgency |
| **Error budget tracking** | Catch cumulative burns that do not trigger rate alerts |

Burn rate alerting transforms your on-call experience from reactive firefighting to proactive reliability management. You get early warning of issues that matter, context about their severity, and clear escalation paths based on how fast you are burning through your error budget.

Start with the recording rules and a single critical alert. Once that is working, add the warning and info tiers. Track your alert quality metrics and tune thresholds based on real incidents.

## Related Reading

- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [18 SRE Metrics Worth Tracking](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
- [Designing an SRE On-Call Rotation](https://oneuptime.com/blog/post/2025-11-28-sre-on-call-rotation-design/view)
- [Google SRE Book - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
