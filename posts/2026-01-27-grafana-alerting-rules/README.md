# How to Implement Grafana Alerting Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Alerting, Monitoring, Observability, Alerts, Notification Policies

Description: Learn how to create and manage Grafana alerting rules, including queries, conditions, notification policies, and contact points for effective incident response.

---

> Grafana Alerting provides a unified system for defining, evaluating, and routing alerts based on your metrics, logs, and traces. A well-designed alerting strategy reduces noise, ensures critical issues get attention, and helps teams respond faster to incidents.

Grafana's unified alerting system consolidates alerting across all data sources into a single interface. This guide walks you through creating alert rules, configuring notification policies, and implementing best practices for production-ready alerting.

---

## Prerequisites

Before we begin, ensure you have:
- Grafana 9.0 or higher (unified alerting enabled by default)
- At least one configured data source (Prometheus, Loki, InfluxDB, etc.)
- Admin or Editor role permissions
- A notification channel target (email, Slack, PagerDuty, etc.)

---

## Understanding Grafana Unified Alerting

Grafana unified alerting consists of several key components:

- **Alert Rules**: Define the conditions that trigger alerts
- **Contact Points**: Specify where notifications are sent
- **Notification Policies**: Route alerts to the right contact points
- **Silences**: Temporarily mute specific alerts
- **Alert Groups**: Group related alerts to reduce noise

---

## Creating Alert Rules

### Basic Alert Rule Structure

Navigate to Alerting > Alert rules > New alert rule. Here is the structure of an alert rule:

```yaml
# Alert rule components explained
# 1. Rule name: Descriptive identifier for the alert
# 2. Query: Data retrieval from your data source
# 3. Expression: Transform and evaluate the query results
# 4. Conditions: Threshold that triggers the alert
# 5. Evaluation: How often to check and how long to wait
# 6. Labels: Metadata for routing and grouping
# 7. Annotations: Human-readable information for notifications
```

### Creating a CPU Alert Rule

This example creates an alert that fires when CPU usage exceeds 80% for 5 minutes:

```yaml
# Alert Rule: High CPU Usage
name: HighCPUUsage
folder: Infrastructure Alerts
group: Server Metrics

# Query A - Fetch CPU usage from Prometheus
queries:
  - refId: A
    datasource: Prometheus
    # Calculate CPU usage percentage across all modes except idle
    expr: |
      100 - (avg by(instance) (
        rate(node_cpu_seconds_total{mode="idle"}[5m])
      ) * 100)
    instant: false
    # Use the range to smooth out spikes
    range: true

# Expression B - Apply threshold condition
expressions:
  - refId: B
    type: threshold
    # Reference the query result
    expression: A
    # Fire when value is above 80
    conditions:
      - evaluator:
          type: gt
          params: [80]
        reducer:
          type: last

# Alert condition - which expression triggers the alert
condition: B
```

### Creating a Memory Alert Rule

```yaml
# Alert Rule: Low Available Memory
name: LowMemoryAvailable
folder: Infrastructure Alerts
group: Server Metrics

queries:
  - refId: A
    datasource: Prometheus
    # Calculate available memory percentage
    expr: |
      (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

expressions:
  - refId: B
    type: threshold
    expression: A
    conditions:
      # Alert when available memory drops below 15%
      - evaluator:
          type: lt
          params: [15]
        reducer:
          type: last

condition: B
```

---

## Alert Conditions and Expressions

### Using Reduce Expressions

Reduce expressions aggregate time series data into a single value:

```yaml
# Reduce expression options
expressions:
  - refId: B
    type: reduce
    expression: A
    reducer:
      # Available reducer types:
      # - last: Most recent value (default)
      # - min: Minimum value in the range
      # - max: Maximum value in the range
      # - mean: Average value
      # - sum: Total of all values
      # - count: Number of data points
      type: mean
```

### Using Math Expressions

Math expressions allow calculations across multiple queries:

```yaml
# Math expression for error rate calculation
queries:
  - refId: A
    datasource: Prometheus
    # Total requests
    expr: sum(rate(http_requests_total[5m]))

  - refId: B
    datasource: Prometheus
    # Failed requests (5xx errors)
    expr: sum(rate(http_requests_total{status=~"5.."}[5m]))

expressions:
  - refId: C
    type: math
    # Calculate error rate percentage
    # Multiply by 100 for percentage, use 0 if no requests
    expression: ($B / $A) * 100

  - refId: D
    type: threshold
    expression: C
    conditions:
      # Alert when error rate exceeds 5%
      - evaluator:
          type: gt
          params: [5]
        reducer:
          type: last

condition: D
```

### Multi-Condition Alerts

Combine multiple conditions using classic conditions:

```yaml
# Classic condition with multiple evaluators
expressions:
  - refId: C
    type: classic_conditions
    conditions:
      # Condition 1: High request latency
      - query:
          params: [A]
        reducer:
          type: avg
        evaluator:
          type: gt
          params: [500]  # 500ms latency threshold
        operator:
          type: and
      # Condition 2: Also high traffic volume
      - query:
          params: [B]
        reducer:
          type: avg
        evaluator:
          type: gt
          params: [1000]  # 1000 requests per second
```

---

## Evaluation Intervals and Pending Periods

### Evaluation Group Settings

```yaml
# Evaluation settings control how often alerts are checked
evaluation:
  # How often to evaluate the alert rule
  # Shorter intervals catch issues faster but increase load
  interval: 1m

  # Pending period - how long condition must be true before firing
  # Prevents alerting on brief spikes
  for: 5m
```

### Choosing Appropriate Intervals

```yaml
# Critical alerts - check frequently, short pending period
critical_alerts:
  interval: 30s
  for: 1m
  # Example: Database down, payment service errors

# Warning alerts - moderate frequency
warning_alerts:
  interval: 1m
  for: 5m
  # Example: High CPU, elevated error rates

# Informational alerts - less frequent
info_alerts:
  interval: 5m
  for: 10m
  # Example: Disk space trending, certificate expiration
```

---

## Labels and Annotations

### Using Labels for Routing

Labels determine how alerts are routed and grouped:

```yaml
# Labels are key-value pairs attached to alerts
labels:
  # Severity determines priority and routing
  severity: critical

  # Team ownership for routing to correct responders
  team: platform

  # Environment helps filter production vs staging
  environment: production

  # Service identifier
  service: api-gateway

  # Custom labels for business context
  cost_center: engineering
```

### Annotations for Context

Annotations provide human-readable information in notifications:

```yaml
# Annotations appear in alert notifications
annotations:
  # Summary - brief description (supports templating)
  summary: "High CPU usage on {{ $labels.instance }}"

  # Description - detailed information
  description: |
    CPU usage has exceeded 80% for the past 5 minutes.

    Instance: {{ $labels.instance }}
    Current Value: {{ $values.A }}%

    This may indicate resource exhaustion or runaway processes.

  # Runbook URL - link to remediation steps
  runbook_url: "https://wiki.example.com/runbooks/high-cpu"

  # Dashboard URL - direct link to relevant dashboard
  dashboard_url: "https://grafana.example.com/d/server-metrics?var-instance={{ $labels.instance }}"
```

### Template Variables

Available template variables for annotations:

```yaml
# Available template variables
annotations:
  summary: |
    # Access label values
    Instance: {{ $labels.instance }}
    Job: {{ $labels.job }}

    # Access query values
    Current CPU: {{ $values.A }}
    Threshold: {{ $values.B }}

    # Humanize large numbers
    Requests: {{ humanize $values.A }}

    # Format percentages
    Error Rate: {{ printf "%.2f" $values.C }}%
```

---

## Notification Policies

### Default Policy Structure

Notification policies form a tree that routes alerts to contact points:

```yaml
# Root notification policy
# All alerts start here and flow down the tree
notification_policies:
  - receiver: default-email
    # Group alerts by these labels
    group_by: [alertname, cluster]
    # Wait before sending first notification
    group_wait: 30s
    # Wait before sending updates to existing groups
    group_interval: 5m
    # Minimum time between notifications
    repeat_interval: 4h
```

### Nested Routing Policies

```yaml
# Nested policies for granular routing
notification_policies:
  - receiver: default-email
    group_by: [alertname]
    routes:
      # Route critical alerts to PagerDuty
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        group_wait: 10s
        repeat_interval: 1h
        continue: false  # Stop processing if matched

      # Route platform team alerts
      - receiver: slack-platform
        matchers:
          - team = platform
        group_by: [alertname, service]
        routes:
          # Nested route for production only
          - receiver: pagerduty-platform
            matchers:
              - environment = production
              - severity =~ "critical|warning"

      # Route database alerts to DBA team
      - receiver: slack-dba
        matchers:
          - service =~ "mysql|postgres|redis"
        group_by: [service, instance]
```

### Matcher Syntax

```yaml
# Matcher operators
matchers:
  # Exact match
  - severity = critical

  # Not equal
  - environment != development

  # Regex match
  - service =~ "api-.*"

  # Regex not match
  - instance !~ "test-.*"

  # Multiple matchers (AND logic)
  - severity = critical
  - team = platform
  - environment = production
```

---

## Contact Points

### Email Contact Point

```yaml
# Email configuration
contact_points:
  - name: team-email
    type: email
    settings:
      # Multiple addresses separated by semicolons
      addresses: "oncall@example.com;team-lead@example.com"
      # Use single email for all alerts in group
      singleEmail: true
      # Custom subject template
      subject: "[{{ .Status }}] {{ .GroupLabels.alertname }}"
      # Custom message template (optional)
      message: |
        {{ len .Alerts }} alert(s) firing

        {{ range .Alerts }}
        - {{ .Annotations.summary }}
        {{ end }}
```

### Slack Contact Point

```yaml
# Slack webhook configuration
contact_points:
  - name: slack-alerts
    type: slack
    settings:
      # Incoming webhook URL from Slack
      url: "https://hooks.slack.com/services/XXX/YYY/ZZZ"
      # Channel override (optional, uses webhook default)
      recipient: "#alerts-production"
      # Bot username
      username: "Grafana Alerts"
      # Icon emoji
      icon_emoji: ":alert:"
      # Message title
      title: "{{ .GroupLabels.alertname }}"
      # Message text with details
      text: |
        {{ range .Alerts }}
        *{{ .Status | toUpper }}* - {{ .Annotations.summary }}
        {{ if .Annotations.description }}
        {{ .Annotations.description }}
        {{ end }}
        {{ end }}
      # Mention users or groups for critical alerts
      mentionUsers: ""
      mentionGroups: ""
      mentionChannel: "here"  # @here for critical
```

### PagerDuty Contact Point

```yaml
# PagerDuty integration
contact_points:
  - name: pagerduty-critical
    type: pagerduty
    settings:
      # Integration key from PagerDuty service
      integrationKey: "your-pagerduty-integration-key"
      # Severity mapping
      severity: "{{ if eq .Status \"firing\" }}critical{{ else }}info{{ end }}"
      # Custom details
      class: "{{ .GroupLabels.alertname }}"
      component: "{{ .GroupLabels.service }}"
      group: "{{ .GroupLabels.team }}"
      # Custom summary
      summary: "{{ .GroupLabels.alertname }} - {{ .CommonAnnotations.summary }}"
```

### Webhook Contact Point

```yaml
# Generic webhook for custom integrations
contact_points:
  - name: custom-webhook
    type: webhook
    settings:
      # Webhook endpoint URL
      url: "https://api.example.com/alerts"
      # HTTP method
      httpMethod: POST
      # Authentication header
      authorization_scheme: Bearer
      authorization_credentials: "your-api-token"
      # Custom headers
      # Max alerts to include
      maxAlerts: 10
```

### Microsoft Teams Contact Point

```yaml
# Microsoft Teams webhook
contact_points:
  - name: teams-alerts
    type: teams
    settings:
      # Teams incoming webhook URL
      url: "https://outlook.office.com/webhook/xxx"
      # Message title
      title: "Grafana Alert: {{ .GroupLabels.alertname }}"
      # Section title
      sectiontitle: "Alert Details"
      # Message content
      message: |
        **Status**: {{ .Status }}
        **Severity**: {{ .GroupLabels.severity }}

        {{ range .Alerts }}
        {{ .Annotations.summary }}
        {{ end }}
```

---

## Silences and Muting

### Creating a Silence

Silences temporarily suppress alert notifications:

```yaml
# Silence configuration
silence:
  # Silence identifier
  comment: "Maintenance window for database upgrade"
  createdBy: "admin@example.com"

  # Duration
  startsAt: "2026-01-27T22:00:00Z"
  endsAt: "2026-01-28T02:00:00Z"

  # Matchers - which alerts to silence
  matchers:
    # Silence all database alerts
    - name: service
      value: postgres
      isRegex: false
      isEqual: true
    # In production only
    - name: environment
      value: production
      isRegex: false
      isEqual: true
```

### Using the CLI for Silences

```bash
# Create a silence using the Grafana API
curl -X POST http://grafana.example.com/api/alertmanager/grafana/api/v2/silences \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Scheduled maintenance",
    "createdBy": "admin",
    "startsAt": "2026-01-27T22:00:00Z",
    "endsAt": "2026-01-28T02:00:00Z",
    "matchers": [
      {
        "name": "alertname",
        "value": "HighCPUUsage",
        "isRegex": false,
        "isEqual": true
      }
    ]
  }'

# List active silences
curl -X GET http://grafana.example.com/api/alertmanager/grafana/api/v2/silences \
  -H "Authorization: Bearer $GRAFANA_TOKEN"

# Delete a silence by ID
curl -X DELETE http://grafana.example.com/api/alertmanager/grafana/api/v2/silence/silence-id \
  -H "Authorization: Bearer $GRAFANA_TOKEN"
```

### Mute Timings

Mute timings define recurring windows when alerts are suppressed:

```yaml
# Mute timing for off-hours
mute_timings:
  - name: outside-business-hours
    time_intervals:
      # Weekday nights (6 PM to 8 AM)
      - times:
          - start_time: "18:00"
            end_time: "24:00"
          - start_time: "00:00"
            end_time: "08:00"
        weekdays: ["monday:friday"]
      # Weekends - all day
      - weekdays: ["saturday", "sunday"]

# Apply to notification policy
notification_policies:
  - receiver: slack-non-critical
    matchers:
      - severity = info
    mute_time_intervals:
      - outside-business-hours
```

---

## Alert State History

### Viewing State History

Alert state history tracks transitions between states:

```yaml
# Alert states
states:
  - Normal: Condition is not met
  - Pending: Condition met, waiting for "for" duration
  - Alerting: Condition met for required duration, firing
  - NoData: Query returned no data
  - Error: Query or evaluation failed
```

### State History API

```bash
# Query alert state history via API
curl -X GET "http://grafana.example.com/api/v1/rules/history" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  --data-urlencode "ruleUID=alert-rule-uid" \
  --data-urlencode "from=2026-01-26T00:00:00Z" \
  --data-urlencode "to=2026-01-27T00:00:00Z"

# Response shows state transitions
# {
#   "results": [
#     {
#       "previous": "Normal",
#       "current": "Pending",
#       "timestamp": "2026-01-27T10:00:00Z",
#       "values": {"A": 85.2}
#     },
#     {
#       "previous": "Pending",
#       "current": "Alerting",
#       "timestamp": "2026-01-27T10:05:00Z",
#       "values": {"A": 87.1}
#     }
#   ]
# }
```

### Configuring State History Storage

```yaml
# grafana.ini settings for state history
[unified_alerting.state_history]
# Enable state history recording
enabled = true

# Backend storage type: annotation, loki, or multiple
backend = loki

# Loki configuration for state history
loki_remote_url = http://loki:3100

# Retention period for state history
# External stores manage their own retention
```

---

## Complete Alert Configuration Example

Here is a complete example bringing together all concepts:

```yaml
# Complete alert configuration for a web application
# File: alerts/web-application.yaml

groups:
  - name: WebApplicationAlerts
    folder: Production Alerts
    interval: 1m
    rules:
      # High Error Rate Alert
      - name: HighErrorRate
        condition: D
        for: 5m
        labels:
          severity: critical
          team: backend
          service: web-api
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: |
            Error rate is {{ printf "%.2f" $values.C }}%
            which exceeds the 5% threshold.

            Instance: {{ $labels.instance }}
            Job: {{ $labels.job }}
          runbook_url: "https://wiki.example.com/runbooks/high-error-rate"
        queries:
          - refId: A
            datasource: Prometheus
            expr: sum(rate(http_requests_total[5m])) by (instance)
          - refId: B
            datasource: Prometheus
            expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (instance)
        expressions:
          - refId: C
            type: math
            expression: ($B / $A) * 100
          - refId: D
            type: threshold
            expression: C
            conditions:
              - evaluator:
                  type: gt
                  params: [5]

      # High Latency Alert
      - name: HighP99Latency
        condition: B
        for: 3m
        labels:
          severity: warning
          team: backend
          service: web-api
        annotations:
          summary: "High P99 latency on {{ $labels.instance }}"
          description: |
            P99 latency is {{ printf "%.0f" $values.A }}ms
            which exceeds the 500ms threshold.
        queries:
          - refId: A
            datasource: Prometheus
            expr: |
              histogram_quantile(0.99,
                sum(rate(http_request_duration_seconds_bucket[5m])) by (le, instance)
              ) * 1000
        expressions:
          - refId: B
            type: threshold
            expression: A
            conditions:
              - evaluator:
                  type: gt
                  params: [500]

      # Pod Restart Alert
      - name: FrequentPodRestarts
        condition: B
        for: 10m
        labels:
          severity: warning
          team: platform
          service: kubernetes
        annotations:
          summary: "Pod {{ $labels.pod }} restarting frequently"
          description: |
            Pod has restarted {{ printf "%.0f" $values.A }} times
            in the last 30 minutes.
        queries:
          - refId: A
            datasource: Prometheus
            expr: |
              increase(kube_pod_container_status_restarts_total[30m]) > 3
        expressions:
          - refId: B
            type: threshold
            expression: A
            conditions:
              - evaluator:
                  type: gt
                  params: [3]

# Notification policies for the above alerts
notification_policies:
  receiver: default-email
  group_by: [alertname, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - receiver: pagerduty-critical
      matchers:
        - severity = critical
      group_wait: 10s
      repeat_interval: 1h
    - receiver: slack-backend
      matchers:
        - team = backend
    - receiver: slack-platform
      matchers:
        - team = platform

# Contact points
contact_points:
  - name: default-email
    type: email
    settings:
      addresses: "alerts@example.com"
  - name: pagerduty-critical
    type: pagerduty
    settings:
      integrationKey: "${PAGERDUTY_KEY}"
  - name: slack-backend
    type: slack
    settings:
      url: "${SLACK_WEBHOOK_BACKEND}"
      recipient: "#backend-alerts"
  - name: slack-platform
    type: slack
    settings:
      url: "${SLACK_WEBHOOK_PLATFORM}"
      recipient: "#platform-alerts"
```

---

## Best Practices Summary

### Alert Design

1. **Alert on symptoms, not causes**: Alert when users are impacted, not on every metric spike
2. **Use appropriate thresholds**: Base thresholds on historical data and SLOs
3. **Set reasonable pending periods**: Avoid alerting on brief spikes with appropriate "for" durations
4. **Include context in annotations**: Provide runbook links, dashboard URLs, and clear descriptions

### Notification Management

1. **Route by severity**: Critical alerts to PagerDuty, warnings to Slack
2. **Group related alerts**: Use group_by to reduce notification noise
3. **Set appropriate repeat intervals**: Avoid notification fatigue with longer intervals for non-critical alerts
4. **Use mute timings**: Suppress non-critical alerts during off-hours

### Maintenance

1. **Review alert history**: Regularly check which alerts fire most frequently
2. **Tune thresholds**: Adjust based on false positive rates
3. **Document runbooks**: Every critical alert should have remediation steps
4. **Test alerts**: Verify alert rules fire correctly before production deployment

### Common Pitfalls to Avoid

1. **Too many alerts**: Only alert on actionable conditions
2. **Missing labels**: Always include severity, team, and service labels
3. **No pending period**: Always use "for" to prevent flapping
4. **Generic annotations**: Include specific values and context in messages

---

## Conclusion

Grafana Alerting provides a comprehensive system for monitoring your infrastructure and applications. The key to effective alerting is finding the balance between catching real issues and avoiding alert fatigue.

Key takeaways:
- Use unified alerting for consistent alert management across data sources
- Design alerts around symptoms and user impact, not raw metrics
- Leverage notification policies for intelligent routing and grouping
- Include actionable context in annotations with runbook links
- Regularly review and tune alerts based on historical data

With proper alert configuration, your team can respond faster to incidents while maintaining focus on the alerts that truly matter.

---

*Looking for a unified observability platform with built-in alerting? [OneUptime](https://oneuptime.com) provides integrated monitoring, alerting, and incident management with support for multiple notification channels. Start monitoring your services with our free tier today.*
