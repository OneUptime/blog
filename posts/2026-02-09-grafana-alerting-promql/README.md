# How to implement Grafana alerting rules with PromQL expressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Alerting, PromQL

Description: Learn how to create effective alerting rules in Grafana using PromQL expressions to detect issues before they impact users.

---

Monitoring without alerting is like having a smoke detector without a battery. You need to know when things go wrong, and you need to know immediately. Grafana's unified alerting system combines powerful PromQL-based expressions with flexible notification routing to help you catch problems before they escalate.

## Understanding Grafana Unified Alerting

Grafana unified alerting replaced the legacy alerting system with a more powerful approach that works across all data sources, not just Prometheus. At its core are alert rules that evaluate expressions and trigger notifications when conditions are met.

Alert rules consist of queries, conditions, and thresholds. When a condition evaluates to true, the alert fires and sends notifications through configured contact points.

## Creating Your First Alert Rule

Start with a simple alert that fires when CPU usage exceeds a threshold.

Navigate to Alerting in the Grafana sidebar, then Alert Rules, and click New Alert Rule.

```yaml
# Alert rule configuration
Rule name: High CPU Usage
Folder: Infrastructure
Evaluation group: compute-alerts
Evaluation interval: 1m

# Query A - get CPU usage
Data source: Prometheus
Query:
  avg by (instance) (
    100 - (rate(node_cpu_seconds_total{mode="idle"}[5m]) * 100)
  )

# Condition - check threshold
Condition: WHEN avg() OF query(A) IS ABOVE 80

# Set alert state to firing for 5 minutes before triggering
For: 5m
```

This alert evaluates every minute, checks if CPU usage exceeds 80%, and only fires if the condition is true for 5 consecutive minutes. The "for" duration prevents flapping from brief spikes.

## Building Multi-Condition Alerts

Real-world alerts often require multiple conditions. Use PromQL expressions to combine conditions logically.

```promql
# Alert when both high CPU and high memory occur together
(
  avg by (instance) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  ) < 0.2
)
and
(
  avg by (instance) (
    node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes
  ) < 0.2
)
```

This query returns results only when both conditions are true for the same instance, creating a more specific alert that reduces false positives.

## Using PromQL Aggregations in Alerts

Aggregations help you create alerts that consider multiple time series together.

```promql
# Alert when more than 30% of pods are down
(
  count by (namespace) (kube_pod_status_phase{phase="Running"})
  /
  count by (namespace) (kube_pod_info)
) < 0.7

# Alert when request rate drops significantly
sum(rate(http_requests_total[5m])) < 100

# Alert when error rate exceeds 5%
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100 > 5
```

These aggregations provide fleet-wide visibility rather than alerting on individual instances.

## Implementing Anomaly Detection with PromQL

Detect unusual behavior by comparing current values to historical baselines.

```promql
# Alert when current traffic is 50% below same time last week
(
  sum(rate(http_requests_total[5m]))
  /
  sum(rate(http_requests_total[5m] offset 1w))
) < 0.5

# Alert when latency is significantly higher than normal
(
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket[5m])
  )
  /
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket[5m] offset 1h)
  )
) > 2
```

These patterns catch deviations from expected behavior that static thresholds might miss.

## Creating Alerts with Multiple Queries

Grafana allows you to create alerts using multiple queries and reduce them to a single boolean expression.

```yaml
# Query A - current error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))

# Query B - current total requests
sum(rate(http_requests_total[5m]))

# Query C - calculate error percentage
$A / $B * 100

# Condition - fire when error rate exceeds 5%
WHEN last() OF C IS ABOVE 5
```

This approach makes complex calculations easier to understand and maintain.

## Handling Missing Data

Alerts should behave sensibly when metrics are missing. Configure how Grafana handles no data scenarios.

```yaml
# Alert rule advanced options
If no data or all values are null: NoData
If execution error or timeout: Error

# In PromQL, provide defaults for missing data
(
  sum(rate(http_requests_total[5m]))
  or
  vector(0)
) < 10
```

The `or vector(0)` clause ensures the query returns zero instead of no data, preventing alert state confusion.

## Setting Alert Severity Levels

Use labels to categorize alerts by severity, enabling different notification routing for different priorities.

```yaml
# Critical alert
Rule name: Database Down
Labels:
  severity: critical
  team: database
  service: postgresql

# Warning alert
Rule name: High Memory Usage
Labels:
  severity: warning
  team: infrastructure
  service: node-exporter
```

Contact point routing can then filter alerts based on these labels, sending critical alerts to PagerDuty and warnings to Slack.

## Creating Rate-of-Change Alerts

Detect sudden changes in metrics, which often indicate problems.

```promql
# Alert when request rate increases by more than 100 requests/sec in 5 minutes
deriv(
  sum(rate(http_requests_total[5m]))[5m:]
) > 100

# Alert when disk usage is growing too quickly
predict_linear(
  node_filesystem_avail_bytes{mountpoint="/"}[1h],
  4 * 3600
) < 0
```

The second query predicts when disk space will be exhausted based on current growth rate, giving you advance warning.

## Implementing SLO-Based Alerting

Service Level Objective alerts help you maintain reliability targets.

```promql
# Alert when error budget is exhausted
# SLO: 99.9% success rate over 30 days
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[30d]))
    /
    sum(rate(http_requests_total[30d]))
  )
) > 0.001

# Alert when burn rate is too high
# Will exhaust error budget in 2 days at current rate
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  /
  sum(rate(http_requests_total[1h]))
) > (0.001 * 2 / 30)
```

SLO alerts focus on user impact rather than arbitrary thresholds, aligning alerts with business objectives.

## Using Template Variables in Alerts

Alert annotations can include dynamic values from your queries to provide context in notifications.

```yaml
Summary: High CPU usage on {{ $labels.instance }}
Description: |
  CPU usage is {{ $values.A.Value | humanizePercentage }}
  on instance {{ $labels.instance }}.

  Current value: {{ $values.A.Value | humanize }}
  Threshold: 80%

  Runbook: https://runbooks.example.com/high-cpu
```

These templates make alert notifications actionable by including relevant details.

## Creating Grouped Alerts

Group related alerts together to reduce notification noise when multiple instances experience the same issue.

```yaml
# Alert rule
Evaluation group: pod-health

Query:
  kube_pod_status_phase{phase!="Running"} == 1

# Group by namespace and phase
Labels:
  namespace: {{ $labels.namespace }}
  phase: {{ $labels.phase }}

# Notification policy will group these
Group by: [namespace, phase]
Group wait: 30s
Group interval: 5m
```

This configuration groups pods in the same namespace with the same status, sending one notification instead of dozens.

## Testing Alerts Before Deployment

Use the alert rule preview feature to see if your alert would have fired based on historical data.

```yaml
# Preview configuration
Time range: Last 6 hours
Evaluation interval: 1m

# Shows:
- When alert would have fired
- When it would have resolved
- Alert state timeline
- Query results at each evaluation
```

This helps you tune thresholds and durations before deploying alerts to production.

## Managing Alert Silences

Temporarily silence alerts during maintenance windows without disabling the rules.

```bash
# Create a silence via API
curl -X POST http://grafana:3000/api/alertmanager/grafana/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {
        "name": "instance",
        "value": "prod-db-01",
        "isRegex": false
      }
    ],
    "startsAt": "2026-02-09T14:00:00Z",
    "endsAt": "2026-02-09T16:00:00Z",
    "createdBy": "ops-team",
    "comment": "Database maintenance window"
  }'
```

Silences prevent notifications without affecting alert evaluation, so you maintain a complete alert history.

## Best Practices for PromQL Alerts

Write alerts that detect symptoms users experience, not internal metrics that might not matter. Alert on slow requests, not high CPU, unless CPU directly impacts users.

Use the "for" duration to prevent alerts from flapping on brief anomalies. Most alerts should wait at least 5 minutes before firing.

Add runbook links to alert annotations so responders know exactly what to do when the alert fires.

Keep alert queries simple. Complex PromQL is harder to understand during incidents and more likely to have bugs.

Test alerts regularly using preview mode or by temporarily lowering thresholds to verify they fire and route correctly.

Review fired alerts monthly to identify chronic issues that should be fixed at the source rather than alerted on repeatedly.

Effective alerting with PromQL transforms your monitoring system from a passive observer into an active guardian that catches issues before they impact your users. Focus on meaningful alerts, clear notifications, and actionable responses to build a system that helps rather than annoys.
