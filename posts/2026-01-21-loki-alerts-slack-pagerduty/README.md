# How to Send Loki Alerts to Slack and PagerDuty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Alerting, Slack, PagerDuty, Alertmanager, LogQL, Incident Response

Description: A comprehensive guide to configuring Loki alerting rules and routing alerts to Slack for notifications and PagerDuty for incident management, including alert templates and escalation policies.

---

Effective alerting is crucial for maintaining system reliability. Grafana Loki can evaluate LogQL queries and generate alerts when log patterns indicate problems. By integrating with Alertmanager, you can route these alerts to Slack for team notifications and PagerDuty for on-call incident management. This guide shows you how to set up end-to-end alerting from Loki logs.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki 2.4 or later with ruler component enabled
- Alertmanager 0.24 or later
- Slack workspace with permissions to create apps/webhooks
- PagerDuty account with API access
- Basic understanding of LogQL and alerting concepts

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Loki Cluster                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Ingester   │    │    Ruler     │    │   Querier    │       │
│  └──────────────┘    └──────┬───────┘    └──────────────┘       │
│                             │                                     │
│                             │ Evaluates LogQL                     │
│                             │ Alert Rules                         │
│                             ▼                                     │
│                    ┌──────────────────┐                          │
│                    │  Alert Manager   │                          │
│                    │  - Routing       │                          │
│                    │  - Grouping      │                          │
│                    │  - Silencing     │                          │
│                    └────────┬─────────┘                          │
└─────────────────────────────┼────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
       ┌──────────────┐               ┌──────────────┐
       │    Slack     │               │  PagerDuty   │
       │  Webhooks    │               │  Events API  │
       └──────────────┘               └──────────────┘
```

## Deploying the Alerting Stack

### Docker Compose Setup

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - ./loki-rules:/loki/rules
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - alerting

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yaml:/etc/alertmanager/alertmanager.yaml
      - ./alertmanager-templates:/etc/alertmanager/templates
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yaml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://alertmanager:9093'
    networks:
      - alerting

  grafana:
    image: grafana/grafana:10.3.1
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana-provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    networks:
      - alerting
    depends_on:
      - loki
      - alertmanager

networks:
  alerting:
    driver: bridge

volumes:
  loki-data:
  alertmanager-data:
  grafana-data:
```

### Loki Configuration with Ruler

Create `loki-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

# Ruler configuration for alerting
ruler:
  storage:
    type: local
    local:
      directory: /loki/rules
  rule_path: /tmp/rules
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
  enable_alertmanager_v2: true
  evaluation_interval: 1m
```

## Configuring Slack Integration

### Creating a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" and select "From scratch"
3. Name your app (e.g., "Loki Alerts") and select your workspace
4. Go to "Incoming Webhooks" and enable them
5. Click "Add New Webhook to Workspace"
6. Select the channel for alerts and authorize
7. Copy the webhook URL

### Alertmanager Slack Configuration

Create `alertmanager.yaml`:

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'severity', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'
  routes:
    # Critical alerts go to both Slack and PagerDuty
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true

    # Warning alerts only to Slack
    - match:
        severity: warning
      receiver: 'slack-warnings'

    # Info alerts to a separate channel
    - match:
        severity: info
      receiver: 'slack-info'
      group_wait: 1m
      repeat_interval: 24h

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        icon_emoji: ':warning:'
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
        actions:
          - type: button
            text: 'View in Grafana'
            url: '{{ template "slack.grafana_url" . }}'
          - type: button
            text: 'Silence Alert'
            url: '{{ template "slack.silence_url" . }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts-warning'
        send_resolved: true
        icon_emoji: ':large_yellow_circle:'
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'

  - name: 'slack-info'
    slack_configs:
      - channel: '#alerts-info'
        send_resolved: false
        icon_emoji: ':information_source:'
        title: '[INFO] {{ .GroupLabels.alertname }}'
        text: '{{ template "slack.text" . }}'

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#alerts-critical'
        send_resolved: true
        icon_emoji: ':rotating_light:'
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
        severity: critical
        description: '{{ template "pagerduty.description" . }}'
        details:
          firing: '{{ template "pagerduty.firing" . }}'
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
```

### Slack Message Templates

Create `alertmanager-templates/slack.tmpl`:

```go
{{ define "slack.title" -}}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.alertname }}
{{- end }}

{{ define "slack.text" -}}
{{ range .Alerts }}
*Alert:* {{ .Annotations.summary }}
*Description:* {{ .Annotations.description }}
*Severity:* `{{ .Labels.severity }}`
*Service:* {{ .Labels.service }}
{{ if .Labels.instance }}*Instance:* {{ .Labels.instance }}{{ end }}
*Started:* {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}
{{ if .EndsAt }}*Ended:* {{ .EndsAt.Format "2006-01-02 15:04:05 MST" }}{{ end }}

*Labels:*
{{ range .Labels.SortedPairs }}  - {{ .Name }}: `{{ .Value }}`
{{ end }}
---
{{ end }}
{{- end }}

{{ define "slack.grafana_url" -}}
http://grafana:3000/explore?left={"datasource":"Loki","queries":[{"expr":"{service=\"{{ .CommonLabels.service }}\"}"}]}
{{- end }}

{{ define "slack.silence_url" -}}
http://alertmanager:9093/#/silences/new?filter={alertname="{{ .CommonLabels.alertname }}"}
{{- end }}
```

## Configuring PagerDuty Integration

### Creating PagerDuty Service Integration

1. Log in to PagerDuty
2. Go to Services and select or create a service
3. Go to Integrations tab
4. Click "Add Integration"
5. Select "Events API v2"
6. Copy the Integration Key

### Alertmanager PagerDuty Configuration

Add to `alertmanager.yaml`:

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
        severity: critical
        class: 'log-alert'
        component: '{{ .CommonLabels.service }}'
        group: '{{ .CommonLabels.alertname }}'
        description: '{{ template "pagerduty.description" . }}'
        details:
          firing: '{{ template "pagerduty.firing" . }}'
          resolved: '{{ template "pagerduty.resolved" . }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'
        links:
          - href: '{{ template "pagerduty.grafana_url" . }}'
            text: 'View in Grafana'
          - href: '{{ .CommonAnnotations.runbook_url }}'
            text: 'Runbook'

  - name: 'pagerduty-high'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
        severity: error
        description: '{{ template "pagerduty.description" . }}'
        details:
          firing: '{{ template "pagerduty.firing" . }}'
```

### PagerDuty Message Templates

Create `alertmanager-templates/pagerduty.tmpl`:

```go
{{ define "pagerduty.description" -}}
{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}
{{- end }}

{{ define "pagerduty.firing" -}}
{{ range .Alerts.Firing }}
Alert: {{ .Labels.alertname }}
Service: {{ .Labels.service }}
Severity: {{ .Labels.severity }}
Description: {{ .Annotations.description }}
Started: {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}
{{ end }}
{{- end }}

{{ define "pagerduty.resolved" -}}
{{ range .Alerts.Resolved }}
Alert: {{ .Labels.alertname }}
Service: {{ .Labels.service }}
Resolved: {{ .EndsAt.Format "2006-01-02 15:04:05 MST" }}
{{ end }}
{{- end }}

{{ define "pagerduty.grafana_url" -}}
http://grafana.example.com/explore?left={"datasource":"Loki","queries":[{"expr":"{service=\"{{ .CommonLabels.service }}\"}"}]}
{{- end }}
```

## Creating Loki Alert Rules

### Alert Rules Configuration

Create `loki-rules/alerts.yaml`:

```yaml
groups:
  - name: application-errors
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({job="application"} |= "error" [5m])) by (service)
          /
          sum(rate({job="application"} [5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected in {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }} for service {{ $labels.service }}"
          runbook_url: "https://wiki.example.com/runbooks/high-error-rate"

      - alert: ErrorBurst
        expr: |
          sum(count_over_time({job="application"} |= "error" [1m])) by (service) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Error burst detected in {{ $labels.service }}"
          description: "More than 100 errors in the last minute for {{ $labels.service }}"

      - alert: CriticalErrorLogged
        expr: |
          count_over_time({job="application"} |~ "CRITICAL|FATAL" [5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Critical error logged"
          description: "A CRITICAL or FATAL error was logged in the application"

  - name: security-alerts
    interval: 30s
    rules:
      - alert: AuthenticationFailures
        expr: |
          sum(count_over_time({job="auth-service"} |= "authentication failed" [5m])) > 10
        for: 5m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "Multiple authentication failures detected"
          description: "More than 10 authentication failures in 5 minutes"

      - alert: SuspiciousActivity
        expr: |
          count_over_time({job="application"} |~ "SQL injection|XSS|unauthorized access" [5m]) > 0
        for: 0m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Suspicious security activity detected"
          description: "Potential security attack pattern found in logs"

      - alert: BruteForceAttempt
        expr: |
          sum by (source_ip) (
            count_over_time({job="auth-service"} |= "login failed" | json | source_ip!="" [10m])
          ) > 20
        for: 1m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Possible brute force attack from {{ $labels.source_ip }}"
          description: "More than 20 failed login attempts from single IP in 10 minutes"

  - name: infrastructure-alerts
    interval: 1m
    rules:
      - alert: ServiceDown
        expr: |
          absent_over_time({service=~".+"} [5m])
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No logs received from services"
          description: "No log data has been received for 5 minutes"

      - alert: DiskSpaceWarning
        expr: |
          count_over_time({job="syslog"} |= "No space left on device" [5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Disk space exhausted"
          description: "A service reported disk space issues"

      - alert: OutOfMemory
        expr: |
          count_over_time({job="application"} |~ "OutOfMemoryError|OOM|memory allocation failed" [5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Out of memory error detected"
          description: "An application reported memory exhaustion"

  - name: performance-alerts
    interval: 1m
    rules:
      - alert: SlowRequests
        expr: |
          quantile_over_time(0.95,
            {job="application"}
            | json
            | unwrap duration [5m]
          ) by (service) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow requests detected in {{ $labels.service }}"
          description: "95th percentile latency is {{ $value }}s for {{ $labels.service }}"

      - alert: HighLatencyEndpoint
        expr: |
          avg_over_time(
            {job="application"}
            | json
            | endpoint="/api/search"
            | unwrap duration [5m]
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on search endpoint"
          description: "Average search latency is {{ $value }}s"

  - name: business-alerts
    interval: 5m
    rules:
      - alert: PaymentFailures
        expr: |
          sum(count_over_time({service="payment-service"} |= "payment failed" [15m])) > 5
        for: 5m
        labels:
          severity: critical
          category: business
        annotations:
          summary: "Multiple payment failures detected"
          description: "More than 5 payment failures in 15 minutes"

      - alert: OrderProcessingErrors
        expr: |
          sum(rate({service="order-service"} |= "order processing failed" [5m])) > 0.1
        for: 5m
        labels:
          severity: warning
          category: business
        annotations:
          summary: "Order processing errors increasing"
          description: "Order processing failure rate is elevated"
```

## Testing the Alerting Pipeline

### Generate Test Alerts

```bash
# Push a test error log to Loki
curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "job": "application",
          "service": "test-service",
          "level": "error"
        },
        "values": [
          ["'"$(date +%s)"'000000000", "error: test error message for alerting"],
          ["'"$(date +%s)"'000000001", "error: another test error"],
          ["'"$(date +%s)"'000000002", "error: third error for burst detection"]
        ]
      }
    ]
  }'
```

### Verify Alert Rules

```bash
# List loaded alert rules
curl -s http://localhost:3100/loki/api/v1/rules | jq

# Check ruler status
curl -s http://localhost:3100/ruler/ring | jq

# View active alerts
curl -s http://localhost:9093/api/v2/alerts | jq
```

### Test Alertmanager Configuration

```bash
# Verify configuration
docker exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yaml

# Send test alert
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "service": "test-service"
      },
      "annotations": {
        "summary": "Test alert from manual trigger",
        "description": "This is a test alert to verify the alerting pipeline"
      }
    }
  ]'
```

## Advanced Routing Configuration

### Time-Based Routing

```yaml
route:
  receiver: 'default'
  routes:
    # Business hours - route to Slack
    - match:
        severity: warning
      receiver: 'slack-warnings'
      active_time_intervals:
        - business_hours

    # Outside business hours - route critical to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      mute_time_intervals:
        - business_hours

time_intervals:
  - name: business_hours
    time_intervals:
      - weekdays: ['monday:friday']
        times:
          - start_time: '09:00'
            end_time: '18:00'
```

### Team-Based Routing

```yaml
route:
  receiver: 'default'
  routes:
    - match:
        team: platform
      receiver: 'platform-team-slack'
      routes:
        - match:
            severity: critical
          receiver: 'platform-team-pagerduty'

    - match:
        team: backend
      receiver: 'backend-team-slack'
      routes:
        - match:
            severity: critical
          receiver: 'backend-team-pagerduty'

receivers:
  - name: 'platform-team-slack'
    slack_configs:
      - channel: '#platform-alerts'
        api_url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'

  - name: 'platform-team-pagerduty'
    pagerduty_configs:
      - service_key: 'PLATFORM_TEAM_KEY'

  - name: 'backend-team-slack'
    slack_configs:
      - channel: '#backend-alerts'
        api_url: 'https://hooks.slack.com/services/AAA/BBB/CCC'

  - name: 'backend-team-pagerduty'
    pagerduty_configs:
      - service_key: 'BACKEND_TEAM_KEY'
```

## Managing Silences

### Create Silence via API

```bash
# Create a silence for maintenance
curl -X POST http://localhost:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {
        "name": "service",
        "value": "payment-service",
        "isRegex": false
      }
    ],
    "startsAt": "2024-01-21T10:00:00Z",
    "endsAt": "2024-01-21T12:00:00Z",
    "createdBy": "admin",
    "comment": "Scheduled maintenance window"
  }'
```

### Silence Management in Grafana

Configure Alertmanager data source in Grafana:

```yaml
# grafana-provisioning/datasources/alertmanager.yaml
apiVersion: 1

datasources:
  - name: Alertmanager
    type: alertmanager
    access: proxy
    url: http://alertmanager:9093
    jsonData:
      implementation: prometheus
```

## Monitoring the Alerting System

### Key Metrics to Monitor

```promql
# Alerts firing
ALERTS{alertstate="firing"}

# Alertmanager notifications sent
alertmanager_notifications_total

# Alertmanager notification failures
alertmanager_notifications_failed_total

# Loki ruler evaluation duration
loki_ruler_eval_duration_seconds

# Loki ruler evaluation failures
loki_ruler_eval_failures_total
```

## Best Practices

1. **Alert Fatigue Prevention**: Set appropriate thresholds and use grouping
2. **Runbook Links**: Always include runbook URLs in annotations
3. **Severity Levels**: Use consistent severity labels (critical, warning, info)
4. **Testing**: Regularly test the alerting pipeline with synthetic alerts
5. **Silences**: Use silences during maintenance windows
6. **Documentation**: Document alert meanings and response procedures
7. **Review Regularly**: Periodically review and tune alert rules

## Conclusion

Integrating Loki alerts with Slack and PagerDuty creates a comprehensive alerting system that keeps your team informed and enables rapid incident response. By configuring appropriate routing rules, templates, and escalation policies, you can ensure the right people are notified at the right time about issues detected in your logs.

Key takeaways:
- Configure Loki's ruler component for alert evaluation
- Use Alertmanager for routing, grouping, and notification management
- Create meaningful alert rules with proper severity levels
- Design Slack messages for quick understanding and action
- Configure PagerDuty for on-call incident management
- Test the entire alerting pipeline regularly
- Implement silences and inhibition rules to reduce noise
