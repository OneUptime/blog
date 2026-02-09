# How to Implement Log-Based SLI Tracking for Kubernetes Services with Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, SLI, Kubernetes

Description: Implement Service Level Indicator tracking using Loki log data to measure service reliability, availability, and performance in Kubernetes environments.

---

Service Level Indicators (SLIs) measure the quality of service provided to users. While metrics-based SLIs are common, log-based SLIs offer unique advantages: they can track user experience more accurately, capture business-relevant events, and work with legacy applications that lack instrumentation. Loki provides the perfect platform for implementing log-based SLI tracking in Kubernetes.

This guide shows you how to define, track, and visualize SLIs using Loki logs.

## Understanding SLIs and SLOs

**SLI (Service Level Indicator)**: A quantifiable measure of service quality (e.g., request success rate, latency, availability)

**SLO (Service Level Objective)**: Target value for an SLI (e.g., 99.9% of requests succeed in <500ms)

**Error Budget**: The allowed amount of unreliability (100% - SLO)

Common SLIs include:
- **Availability**: Percentage of successful requests
- **Latency**: Percentage of requests faster than threshold
- **Quality**: Percentage of requests with correct output
- **Throughput**: Request rate within acceptable range

## Defining Log-Based SLIs

Create SLI definitions based on your log data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sli-definitions
  namespace: monitoring
data:
  sli-config.yaml: |
    services:
      - name: api-service
        namespace: production
        slis:
          # Availability SLI: Percentage of successful requests
          - name: availability
            type: availability
            good_events_query: |
              count_over_time({namespace="production", app="api-service"}
                | json
                | status_code < 500 [1m])
            total_events_query: |
              count_over_time({namespace="production", app="api-service"}
                | json
                | status_code=~".+" [1m])
            target: 99.9

          # Latency SLI: Percentage of requests faster than 500ms
          - name: latency
            type: latency
            threshold_ms: 500
            good_events_query: |
              count_over_time({namespace="production", app="api-service"}
                | json
                | duration_ms < 500 [1m])
            total_events_query: |
              count_over_time({namespace="production", app="api-service"}
                | json
                | duration_ms > 0 [1m])
            target: 95.0

          # Quality SLI: Percentage of requests without errors
          - name: quality
            type: quality
            good_events_query: |
              count_over_time({namespace="production", app="api-service"}
                | json
                | error_code="" or error_code="null" [1m])
            total_events_query: |
              count_over_time({namespace="production", app="api-service"}
                | json [1m])
            target: 99.0
```

## Implementing SLI Recording Rules

Create Loki recording rules to calculate SLIs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-sli-rules
  namespace: logging
data:
  sli-rules.yaml: |
    groups:
      - name: api_service_slis
        interval: 1m
        rules:
          # Availability SLI
          - record: sli:availability:ratio
            expr: |
              sum(count_over_time({namespace="production", app="api-service"}
                | json
                | status_code < 500 [1m]))
              /
              sum(count_over_time({namespace="production", app="api-service"}
                | json
                | status_code=~".+" [1m]))
            labels:
              service: api-service
              sli_type: availability

          # Latency SLI (requests < 500ms)
          - record: sli:latency:ratio
            expr: |
              sum(count_over_time({namespace="production", app="api-service"}
                | json
                | duration_ms < 500 [1m]))
              /
              sum(count_over_time({namespace="production", app="api-service"}
                | json
                | duration_ms > 0 [1m]))
            labels:
              service: api-service
              sli_type: latency
              threshold: 500ms

          # Error budget remaining (for 99.9% SLO)
          - record: sli:error_budget:ratio
            expr: |
              1 - (
                (1 - 0.999) -  # SLO target
                (1 - sli:availability:ratio{service="api-service"})
              ) / (1 - 0.999)
            labels:
              service: api-service

      - name: payment_service_slis
        interval: 1m
        rules:
          # Payment success rate
          - record: sli:payment_success:ratio
            expr: |
              sum(count_over_time({namespace="production", app="payment-service"}
                | json
                | payment_status="success" [1m]))
              /
              sum(count_over_time({namespace="production", app="payment-service"}
                | json
                | payment_status=~".+" [1m]))
            labels:
              service: payment-service
              sli_type: success_rate

          # Payment processing time (<3s)
          - record: sli:payment_latency:ratio
            expr: |
              sum(count_over_time({namespace="production", app="payment-service"}
                | json
                | processing_time_ms < 3000 [1m]))
              /
              sum(count_over_time({namespace="production", app="payment-service"}
                | json
                | processing_time_ms > 0 [1m]))
            labels:
              service: payment-service
              sli_type: latency
              threshold: 3s

      - name: database_service_slis
        interval: 1m
        rules:
          # Query success rate
          - record: sli:db_query_success:ratio
            expr: |
              sum(count_over_time({namespace="production", app="database"}
                | json
                | query_status!="error" [1m]))
              /
              sum(count_over_time({namespace="production", app="database"}
                | json
                | query_status=~".+" [1m]))
            labels:
              service: database
              sli_type: success_rate

          # Query latency (<100ms)
          - record: sli:db_query_latency:ratio
            expr: |
              sum(count_over_time({namespace="production", app="database"}
                | json
                | query_duration_ms < 100 [1m]))
              /
              sum(count_over_time({namespace="production", app="database"}
                | json
                | query_duration_ms > 0 [1m]))
            labels:
              service: database
              sli_type: latency
              threshold: 100ms
```

## Creating SLO Alerts

Define alerts when SLOs are at risk:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-slo-alerts
  namespace: logging
data:
  slo-alerts.yaml: |
    groups:
      - name: slo_alerts
        interval: 1m
        rules:
          # Fast burn: 2% error budget consumed in 1 hour
          - alert: SLOFastBurn
            expr: |
              (
                1 - sum(rate({namespace="production", app="api-service"}
                  | json
                  | status_code < 500 [1h]))
                /
                sum(rate({namespace="production", app="api-service"}
                  | json
                  | status_code=~".+" [1h]))
              ) > 0.02  # More than 2% errors
            for: 5m
            labels:
              severity: critical
              service: api-service
            annotations:
              summary: "Fast burn detected for api-service"
              description: "Error rate is {{ $value | printf \"%.2f%%\" }}, consuming error budget rapidly"

          # Slow burn: SLI below target for extended period
          - alert: SLOSlowBurn
            expr: |
              (
                sum(rate({namespace="production", app="api-service"}
                  | json
                  | status_code < 500 [6h]))
                /
                sum(rate({namespace="production", app="api-service"}
                  | json
                  | status_code=~".+" [6h]))
              ) < 0.999  # Below 99.9% SLO
            for: 30m
            labels:
              severity: warning
              service: api-service
            annotations:
              summary: "Slow burn detected for api-service"
              description: "SLI is {{ $value | printf \"%.4f%%\" }}, below 99.9% target"

          # Error budget exhausted
          - alert: ErrorBudgetExhausted
            expr: |
              (
                sum(count_over_time({namespace="production", app="api-service"}
                  | json
                  | status_code >= 500 [30d]))
                /
                sum(count_over_time({namespace="production", app="api-service"}
                  | json
                  | status_code=~".+" [30d]))
              ) > 0.001  # More than 0.1% errors over 30 days
            labels:
              severity: critical
              service: api-service
            annotations:
              summary: "Error budget exhausted for api-service"
              description: "30-day error rate exceeds budget"

          # Latency SLO violation
          - alert: LatencySLOViolation
            expr: |
              (
                sum(count_over_time({namespace="production", app="api-service"}
                  | json
                  | duration_ms < 500 [1h]))
                /
                sum(count_over_time({namespace="production", app="api-service"}
                  | json
                  | duration_ms > 0 [1h]))
              ) < 0.95  # Below 95% latency target
            for: 15m
            labels:
              severity: warning
              service: api-service
            annotations:
              summary: "Latency SLO violation for api-service"
              description: "Only {{ $value | printf \"%.2f%%\" }} of requests under 500ms"
```

## Building SLI Dashboards in Grafana

Create comprehensive SLI dashboards:

```json
{
  "dashboard": {
    "title": "Service SLIs and SLOs",
    "panels": [
      {
        "title": "Availability SLI (30d)",
        "type": "stat",
        "targets": [
          {
            "expr": "(\n  sum(count_over_time({namespace=\"production\", app=\"api-service\"}\n    | json\n    | status_code < 500 [30d]))\n  /\n  sum(count_over_time({namespace=\"production\", app=\"api-service\"}\n    | json\n    | status_code=~\".+\" [30d]))\n) * 100",
            "legendFormat": "Availability %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 99.5, "color": "yellow" },
                { "value": 99.9, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "title": "Error Budget Remaining",
        "type": "gauge",
        "targets": [
          {
            "expr": "100 - (\n  (\n    sum(count_over_time({namespace=\"production\", app=\"api-service\"}\n      | json\n      | status_code >= 500 [30d]))\n    /\n    sum(count_over_time({namespace=\"production\", app=\"api-service\"}\n      | json\n      | status_code=~\".+\" [30d]))\n  ) / 0.001\n) * 100",
            "legendFormat": "Budget %"
          }
        ]
      },
      {
        "title": "Latency SLI (Requests < 500ms)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "(\n  sum(rate({namespace=\"production\", app=\"api-service\"}\n    | json\n    | duration_ms < 500 [$__interval]))\n  /\n  sum(rate({namespace=\"production\", app=\"api-service\"}\n    | json\n    | duration_ms > 0 [$__interval]))\n) * 100",
            "legendFormat": "Latency SLI"
          }
        ]
      }
    ]
  }
}
```

## Tracking Multi-Window SLOs

Implement multi-window SLO tracking for better alerting:

```logql
# 1-hour window (fast burn)
(
  sum(rate({namespace="production", app="api-service"}
    | json
    | status_code < 500 [1h]))
  /
  sum(rate({namespace="production", app="api-service"}
    | json
    | status_code=~".+" [1h]))
)

# 6-hour window (moderate burn)
(
  sum(rate({namespace="production", app="api-service"}
    | json
    | status_code < 500 [6h]))
  /
  sum(rate({namespace="production", app="api-service"}
    | json
    | status_code=~".+" [6h]))
)

# 30-day window (overall SLO)
(
  sum(count_over_time({namespace="production", app="api-service"}
    | json
    | status_code < 500 [30d]))
  /
  sum(count_over_time({namespace="production", app="api-service"}
    | json
    | status_code=~".+" [30d]))
)
```

## Calculating Error Budget Burn Rate

Track how fast you're consuming error budget:

```logql
# Current burn rate (errors per hour)
sum(rate({namespace="production", app="api-service"}
  | json
  | status_code >= 500 [1h])) * 3600

# Burn rate as multiple of budget
(
  sum(rate({namespace="production", app="api-service"}
    | json
    | status_code >= 500 [1h]))
  /
  (0.001 / 720)  # 0.1% budget / hours in 30 days
)
```

## Implementing User Journey SLIs

Track SLIs for complete user journeys:

```logql
# Checkout success rate (end-to-end)
sum(count_over_time({namespace="production"}
  | json
  | journey="checkout"
  | status="success" [1m]))
/
sum(count_over_time({namespace="production"}
  | json
  | journey="checkout"
  | status=~".+" [1m]))

# Average journey duration
sum(sum_over_time({namespace="production"}
  | json
  | journey="checkout"
  | unwrap duration_ms [5m]))
/
sum(count_over_time({namespace="production"}
  | json
  | journey="checkout" [5m]))
```

## Best Practices for Log-Based SLIs

1. **Define clear success criteria**: Explicitly specify what constitutes a good event
2. **Use consistent time windows**: Align SLI calculations with SLO periods
3. **Account for sampling**: If logs are sampled, adjust calculations accordingly
4. **Validate log coverage**: Ensure all relevant events are logged
5. **Monitor SLI calculation performance**: Complex LogQL can be resource-intensive
6. **Set realistic targets**: Base SLOs on historical performance data
7. **Track multiple SLIs**: Don't rely on a single indicator

## Reporting and Visualization

Generate monthly SLO reports:

```logql
# Monthly availability report
sum(count_over_time({namespace="production", app="api-service"}
  | json
  | status_code < 500 [30d]))
/
sum(count_over_time({namespace="production", app="api-service"}
  | json
  | status_code=~".+" [30d]))

# Error budget consumption by week
sum by (week) (
  count_over_time({namespace="production", app="api-service"}
    | json
    | status_code >= 500 [7d])
)
```

## Conclusion

Log-based SLI tracking with Loki provides a powerful alternative to traditional metrics-based monitoring. By leveraging the rich context available in logs, you can create SLIs that better reflect user experience and business outcomes. Start with simple availability and latency SLIs, validate them against your SLO targets, and gradually expand to more sophisticated indicators as your observability practice matures. Remember that SLIs are only valuable if they drive action, so ensure your team understands and acts on SLO violations.
