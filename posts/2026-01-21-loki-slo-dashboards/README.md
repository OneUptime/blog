# How to Build SLO Dashboards with Loki Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, SLO, SLI, Error Budget, Observability, Site Reliability Engineering, LogQL

Description: A comprehensive guide to building Service Level Objective dashboards using Grafana Loki logs, covering error budget calculation, SLI metrics from logs, burn rate alerting, and practical SLO implementation patterns.

---

Service Level Objectives (SLOs) define the reliability targets for your services. While traditionally calculated from metrics, you can also derive SLIs and SLOs from log data using Grafana Loki. This approach is particularly useful when you have detailed request-level information in logs that may not be captured in metrics. This guide shows you how to build comprehensive SLO dashboards using Loki.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki 2.4 or later
- Grafana 9.0 or later
- Structured logs with request/response data
- Understanding of SLO concepts (SLI, SLO, Error Budget)

## SLO Fundamentals

### Key Concepts

- **SLI (Service Level Indicator)**: A quantitative measure of service behavior (e.g., error rate, latency)
- **SLO (Service Level Objective)**: A target value for an SLI (e.g., 99.9% availability)
- **Error Budget**: The amount of unreliability you can tolerate (1 - SLO)
- **Burn Rate**: How fast you are consuming your error budget

```
┌─────────────────────────────────────────────────────────────────┐
│                     SLO Dashboard Architecture                   │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Logs       │───▶│   SLIs       │───▶│   SLOs       │       │
│  │ (Raw Data)   │    │ (Indicators) │    │ (Objectives) │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                    │                │
│         │                   │                    │                │
│         ▼                   ▼                    ▼                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Error Budget                          │    │
│  │  - Budget Remaining                                      │    │
│  │  - Burn Rate                                             │    │
│  │  - Time to Exhaustion                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Calculating SLIs from Logs

### Availability SLI

```logql
# Total requests
sum(count_over_time({job="application"} | json | endpoint!="" [$__range]))

# Successful requests (status < 500)
sum(count_over_time({job="application"} | json | status_code < 500 [$__range]))

# Availability SLI (as percentage)
sum(count_over_time({job="application"} | json | status_code < 500 [$__range]))
/
sum(count_over_time({job="application"} | json | endpoint!="" [$__range]))
* 100

# By service
sum by (service) (count_over_time({job="application"} | json | status_code < 500 [$__range]))
/
sum by (service) (count_over_time({job="application"} | json | endpoint!="" [$__range]))
* 100
```

### Latency SLI

```logql
# Requests faster than threshold (e.g., 500ms)
sum(count_over_time({job="application"} | json | duration < 0.5 [$__range]))

# Total requests
sum(count_over_time({job="application"} | json | duration > 0 [$__range]))

# Latency SLI (percentage of requests under threshold)
sum(count_over_time({job="application"} | json | duration < 0.5 [$__range]))
/
sum(count_over_time({job="application"} | json | duration > 0 [$__range]))
* 100

# Multi-threshold latency SLI (90% under 200ms, 99% under 1s)
# P90 check
(
  sum(count_over_time({job="application"} | json | duration < 0.2 [$__range]))
  /
  sum(count_over_time({job="application"} | json | duration > 0 [$__range]))
) >= 0.90

# P99 check
(
  sum(count_over_time({job="application"} | json | duration < 1.0 [$__range]))
  /
  sum(count_over_time({job="application"} | json | duration > 0 [$__range]))
) >= 0.99
```

### Quality SLI (Business Logic Errors)

```logql
# Successful business operations
sum(count_over_time({job="application"} | json | result="success" [$__range]))

# Total business operations
sum(count_over_time({job="application"} | json | operation!="" [$__range]))

# Quality SLI
sum(count_over_time({job="application"} | json | result="success" [$__range]))
/
sum(count_over_time({job="application"} | json | operation!="" [$__range]))
* 100
```

## Error Budget Calculations

### Error Budget Formula

```
Error Budget = 1 - SLO
Budget Consumed = (1 - SLI) / Error Budget
Budget Remaining = 1 - Budget Consumed
```

### LogQL Error Budget Queries

```logql
# SLO: 99.9% availability
# Error Budget: 0.1% (0.001)

# Current SLI
(
  sum(count_over_time({job="application"} | json | status_code < 500 [$__range]))
  /
  sum(count_over_time({job="application"} | json | endpoint!="" [$__range]))
)

# Error rate (1 - SLI)
1 - (
  sum(count_over_time({job="application"} | json | status_code < 500 [$__range]))
  /
  sum(count_over_time({job="application"} | json | endpoint!="" [$__range]))
)

# Budget consumed (for 99.9% SLO)
(
  1 - (
    sum(count_over_time({job="application"} | json | status_code < 500 [$__range]))
    /
    sum(count_over_time({job="application"} | json | endpoint!="" [$__range]))
  )
) / 0.001

# Budget remaining
1 - (
  (
    1 - (
      sum(count_over_time({job="application"} | json | status_code < 500 [$__range]))
      /
      sum(count_over_time({job="application"} | json | endpoint!="" [$__range]))
    )
  ) / 0.001
)
```

## Burn Rate Calculation

### What is Burn Rate?

Burn rate measures how fast you are consuming your error budget relative to your SLO window:

```
Burn Rate = Error Rate / Error Budget
```

A burn rate of 1 means you will exactly exhaust your budget over the SLO window. A burn rate of 2 means you will exhaust it in half the time.

### Burn Rate LogQL Queries

```logql
# Short window burn rate (1 hour)
# For 99.9% SLO over 30 days, error budget = 0.1%
# If burn rate > 14.4, budget exhausts in 2 hours

(
  1 - (
    sum(count_over_time({job="application"} | json | status_code < 500 [1h]))
    /
    sum(count_over_time({job="application"} | json | endpoint!="" [1h]))
  )
) / 0.001

# Long window burn rate (6 hours)
(
  1 - (
    sum(count_over_time({job="application"} | json | status_code < 500 [6h]))
    /
    sum(count_over_time({job="application"} | json | endpoint!="" [6h]))
  )
) / 0.001

# Multi-window burn rate (recommended for alerting)
# Alert when: 1h burn rate > 14.4 AND 5m burn rate > 14.4
```

## Building the SLO Dashboard

### Dashboard Variables

```json
{
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "query": "label_values({job=\"application\"}, service)",
        "multi": false
      },
      {
        "name": "slo_target",
        "type": "custom",
        "options": [
          {"text": "99.9%", "value": "0.999"},
          {"text": "99.5%", "value": "0.995"},
          {"text": "99%", "value": "0.99"}
        ]
      },
      {
        "name": "slo_window",
        "type": "custom",
        "options": [
          {"text": "30 days", "value": "30d"},
          {"text": "7 days", "value": "7d"},
          {"text": "24 hours", "value": "24h"}
        ]
      }
    ]
  }
}
```

### SLI Status Panel

```json
{
  "type": "stat",
  "title": "Current SLI - Availability",
  "targets": [
    {
      "expr": "sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [$slo_window])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [$slo_window])) * 100",
      "instant": true
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "decimals": 3,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": null},
          {"color": "yellow", "value": 99},
          {"color": "green", "value": 99.9}
        ]
      },
      "mappings": [],
      "min": 95,
      "max": 100
    }
  },
  "options": {
    "colorMode": "background",
    "graphMode": "area",
    "orientation": "auto"
  }
}
```

### Error Budget Remaining Panel

```json
{
  "type": "gauge",
  "title": "Error Budget Remaining",
  "targets": [
    {
      "expr": "(1 - ((1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [$slo_window])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [$slo_window])))) / (1 - $slo_target))) * 100",
      "instant": true
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "min": 0,
      "max": 100,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": 0},
          {"color": "yellow", "value": 25},
          {"color": "green", "value": 50}
        ]
      }
    }
  }
}
```

### Burn Rate Panel

```json
{
  "type": "timeseries",
  "title": "Burn Rate Over Time",
  "targets": [
    {
      "expr": "(1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [1h])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [1h])))) / (1 - $slo_target)",
      "legendFormat": "1h Burn Rate"
    },
    {
      "expr": "(1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [6h])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [6h])))) / (1 - $slo_target)",
      "legendFormat": "6h Burn Rate"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "short",
      "custom": {
        "thresholdsStyle": {
          "mode": "line"
        }
      },
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "green", "value": null},
          {"color": "yellow", "value": 1},
          {"color": "red", "value": 2}
        ]
      }
    }
  }
}
```

### SLI Trend Panel

```json
{
  "type": "timeseries",
  "title": "SLI Trend",
  "targets": [
    {
      "expr": "sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [5m])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [5m])) * 100",
      "legendFormat": "SLI"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "min": 95,
      "max": 100,
      "custom": {
        "thresholdsStyle": {
          "mode": "line"
        }
      },
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": null},
          {"color": "green", "value": 99.9}
        ]
      }
    }
  }
}
```

### Error Budget Consumption Over Time

```json
{
  "type": "timeseries",
  "title": "Cumulative Error Budget Consumption",
  "targets": [
    {
      "expr": "((1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [$__range])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [$__range])))) / (1 - $slo_target)) * 100",
      "legendFormat": "Budget Consumed %"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "max": 100,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "green", "value": null},
          {"color": "yellow", "value": 50},
          {"color": "red", "value": 75}
        ]
      }
    }
  }
}
```

## Complete SLO Dashboard JSON

```json
{
  "dashboard": {
    "title": "Service SLO Dashboard",
    "uid": "slo-dashboard",
    "tags": ["slo", "sre", "loki"],
    "timezone": "browser",
    "refresh": "1m",
    "templating": {
      "list": [
        {
          "name": "service",
          "type": "query",
          "datasource": "Loki",
          "query": "label_values({job=\"application\"}, service)",
          "refresh": 1
        },
        {
          "name": "slo_target",
          "type": "custom",
          "current": {"text": "99.9%", "value": "0.999"},
          "options": [
            {"text": "99.99%", "value": "0.9999"},
            {"text": "99.9%", "value": "0.999"},
            {"text": "99.5%", "value": "0.995"},
            {"text": "99%", "value": "0.99"}
          ]
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "Current SLI",
        "type": "stat",
        "gridPos": {"x": 0, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [30d])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [30d])) * 100",
            "instant": true
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "decimals": 3,
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "green", "value": 99.9}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "SLO Target",
        "type": "stat",
        "gridPos": {"x": 6, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "$slo_target * 100",
            "instant": true
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "percent", "decimals": 2}
        }
      },
      {
        "id": 3,
        "title": "Error Budget Remaining",
        "type": "gauge",
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "(1 - ((1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [30d])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [30d])))) / (1 - $slo_target))) * 100",
            "instant": true
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "id": 4,
        "title": "Burn Rate (1h)",
        "type": "stat",
        "gridPos": {"x": 18, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "(1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [1h])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [1h])))) / (1 - $slo_target)",
            "instant": true
          }
        ],
        "fieldConfig": {
          "defaults": {
            "decimals": 2,
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 2}
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "SLI Over Time",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 4, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [$__interval])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [$__interval])) * 100",
            "legendFormat": "SLI"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "percent", "min": 95, "max": 100}
        }
      },
      {
        "id": 6,
        "title": "Burn Rate Over Time",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "(1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [1h])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [1h])))) / (1 - $slo_target)",
            "legendFormat": "1h"
          },
          {
            "expr": "(1 - (sum(count_over_time({job=\"application\", service=\"$service\"} | json | status_code < 500 [6h])) / sum(count_over_time({job=\"application\", service=\"$service\"} | json | endpoint!=\"\" [6h])))) / (1 - $slo_target)",
            "legendFormat": "6h"
          }
        ]
      },
      {
        "id": 7,
        "title": "Error Events",
        "type": "logs",
        "gridPos": {"x": 0, "y": 12, "w": 24, "h": 8},
        "targets": [
          {
            "expr": "{job=\"application\", service=\"$service\"} | json | status_code >= 500"
          }
        ]
      }
    ]
  }
}
```

## SLO Alerting

### Burn Rate Alerts

Create alerts based on burn rate to catch SLO violations early:

```yaml
# Grafana alert rule for high burn rate
Alert Name: HighBurnRate
Query:
  Expression: |
    (1 - (
      sum(count_over_time({job="application", service="$service"} | json | status_code < 500 [1h]))
      /
      sum(count_over_time({job="application", service="$service"} | json | endpoint!="" [1h]))
    )) / (1 - 0.999)

Condition: IS ABOVE 14.4
For: 5m

Labels:
  severity: critical

Annotations:
  summary: High burn rate for {{ $labels.service }}
  description: |
    Burn rate is {{ $value }}, which will exhaust the error budget in less than 2 hours.
    Current SLO target: 99.9%
```

### Multi-Window Burn Rate Alert

```yaml
# Alert when both short and long window burn rates are high
Alert Name: MultiWindowBurnRate

Query A (1h burn rate):
  Expression: |
    (1 - (sum(count_over_time({job="application"} | json | status_code < 500 [1h])) / sum(count_over_time({job="application"} | json | endpoint!="" [1h])))) / 0.001

Query B (5m burn rate):
  Expression: |
    (1 - (sum(count_over_time({job="application"} | json | status_code < 500 [5m])) / sum(count_over_time({job="application"} | json | endpoint!="" [5m])))) / 0.001

Condition: A > 14.4 AND B > 14.4
```

## Recording Rules for SLOs

Create Loki recording rules to pre-compute SLO metrics:

```yaml
# loki-rules/slo-recording-rules.yaml
groups:
  - name: slo-metrics
    interval: 1m
    rules:
      # Availability SLI - 5 minute window
      - record: sli:availability:5m
        expr: |
          sum by (service) (
            count_over_time({job="application"} | json | status_code < 500 [5m])
          )
          /
          sum by (service) (
            count_over_time({job="application"} | json | endpoint!="" [5m])
          )

      # Error count for budget calculation
      - record: sli:errors:5m
        expr: |
          sum by (service) (
            count_over_time({job="application"} | json | status_code >= 500 [5m])
          )

      # Total requests
      - record: sli:requests:5m
        expr: |
          sum by (service) (
            count_over_time({job="application"} | json | endpoint!="" [5m])
          )

      # Latency SLI (% under 500ms)
      - record: sli:latency_500ms:5m
        expr: |
          sum by (service) (
            count_over_time({job="application"} | json | duration < 0.5 [5m])
          )
          /
          sum by (service) (
            count_over_time({job="application"} | json | duration > 0 [5m])
          )
```

## Best Practices

1. **Define Clear SLOs**: Start with achievable targets based on current performance
2. **Use Multiple SLIs**: Combine availability, latency, and quality SLIs
3. **Appropriate Windows**: Use 30-day rolling windows for SLOs, shorter for burn rate
4. **Multi-Window Alerting**: Alert on both short and long burn rate windows
5. **Document SLOs**: Make sure teams understand what each SLO measures
6. **Review Regularly**: Adjust SLO targets based on business requirements
7. **Exclude Planned Downtime**: Consider excluding maintenance windows from calculations

## Conclusion

Building SLO dashboards with Loki logs provides visibility into service reliability using the detailed request-level data available in logs. By calculating SLIs, tracking error budgets, and implementing burn rate alerting, you can proactively manage service reliability and make informed decisions about where to invest engineering effort.

Key takeaways:
- Calculate availability and latency SLIs from structured logs
- Track error budget consumption over your SLO window
- Implement burn rate monitoring for early warning
- Create multi-window alerts for reliable SLO violation detection
- Use recording rules to optimize expensive SLO queries
- Build dashboards that give teams visibility into reliability metrics
