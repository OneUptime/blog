# How to Send OpenTelemetry Alert Notifications to Slack Channels with Rich Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Slack, Alerting, Notifications

Description: Configure OpenTelemetry alert notifications to Slack with rich formatting, trace links, runbook URLs, and contextual metadata for faster incident response.

Slack is where most engineering teams spend their day, making it the natural place for alert notifications. But a bare alert message like "HighErrorRate firing" is not very useful. The on-call engineer has to open another tool to figure out which service is affected, how bad the problem is, and where to start debugging.

This post shows how to send richly formatted OpenTelemetry alert notifications to Slack that include service context, metric values, trace links, and runbook URLs - all visible without leaving the Slack channel.

## Architecture

The alert flow goes from OpenTelemetry metrics through Prometheus for evaluation, then Alertmanager handles formatting and delivery to Slack via incoming webhooks.

```mermaid
graph LR
    A[OTel Collector] --> B[Prometheus]
    B --> C[Alertmanager]
    C --> D[Slack Webhook]
    D --> E[#alerts-critical]
    D --> F[#alerts-warning]
    D --> G[#team-specific]
```

## Setting Up the Slack Incoming Webhook

Before configuring Alertmanager, create a Slack app and incoming webhook:

1. Go to https://api.slack.com/apps and create a new app
2. Enable "Incoming Webhooks" under Features
3. Add a webhook to your target workspace and channel
4. Copy the webhook URL

You will get a URL like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`.

## Basic Alertmanager Slack Configuration

Here is a minimal Alertmanager configuration that sends all alerts to Slack:

```yaml
# alertmanager.yaml
# Basic Slack notification setup

global:
  resolve_timeout: 5m
  slack_api_url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

route:
  receiver: slack-default
  group_by: [alertname, service_name]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: slack-default
    slack_configs:
      - channel: "#alerts"
        send_resolved: true
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
```

This works, but the notifications are plain and lack context. Here is how to make them useful.

## Rich Slack Notifications with Block Kit

Alertmanager supports Slack's Block Kit for structured message formatting. You can include multiple sections with headers, fields, and action buttons.

```yaml
# alertmanager.yaml
# Rich Slack notifications with full context

global:
  resolve_timeout: 5m

route:
  receiver: slack-default
  group_by: [alertname, service_name]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Critical alerts go to the dedicated critical channel
    - match:
        severity: critical
      receiver: slack-critical
      repeat_interval: 30m

    # Warning alerts go to a separate channel
    - match:
        severity: warning
      receiver: slack-warning
      repeat_interval: 2h

    # Route team-specific alerts to team channels
    - match:
        team: payments
      receiver: slack-payments-team
      continue: true

receivers:
  - name: slack-default
    slack_configs:
      - api_url: "https://hooks.slack.com/services/YOUR/DEFAULT/WEBHOOK"
        channel: "#alerts"
        send_resolved: true
        title: '{{ if eq .Status "firing" }}:red_circle:{{ else }}:large_green_circle:{{ end }} {{ .CommonLabels.alertname }}'
        text: >-
          {{ .CommonAnnotations.summary }}
        fields:
          - title: Severity
            value: '{{ .CommonLabels.severity }}'
            short: true
          - title: Service
            value: '{{ .CommonLabels.service_name }}'
            short: true

  - name: slack-critical
    slack_configs:
      - api_url: "https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK"
        channel: "#alerts-critical"
        send_resolved: true
        # Color the sidebar red for firing, green for resolved
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
        title: '{{ if eq .Status "firing" }}FIRING{{ else }}RESOLVED{{ end }} - {{ .CommonLabels.alertname }}'
        title_link: '{{ .CommonAnnotations.dashboard_url }}'
        # Structured text with all the context an on-call engineer needs
        text: >-
          *Summary:* {{ .CommonAnnotations.summary }}

          *Description:* {{ .CommonAnnotations.description }}

          *Runbook:* {{ .CommonAnnotations.runbook_url }}
        fields:
          - title: Service
            value: '{{ .CommonLabels.service_name }}'
            short: true
          - title: Severity
            value: '{{ .CommonLabels.severity }}'
            short: true
          - title: Environment
            value: '{{ .CommonLabels.environment }}'
            short: true
          - title: Firing Alerts
            value: '{{ .Alerts.Firing | len }}'
            short: true
          - title: Quick Links
            value: >-
              <{{ .CommonAnnotations.traces_url }}|View Traces> |
              <{{ .CommonAnnotations.logs_url }}|View Logs> |
              <{{ .CommonAnnotations.dashboard_url }}|Dashboard>
            short: false
        # Action buttons for common responses
        actions:
          - type: button
            text: "View Runbook"
            url: '{{ .CommonAnnotations.runbook_url }}'
          - type: button
            text: "Acknowledge"
            url: '{{ .ExternalURL }}/#/silences/new?filter=%7Balertname%3D%22{{ .CommonLabels.alertname }}%22%7D'

  - name: slack-warning
    slack_configs:
      - api_url: "https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK"
        channel: "#alerts-warning"
        send_resolved: true
        color: '{{ if eq .Status "firing" }}warning{{ else }}good{{ end }}'
        title: '{{ .CommonLabels.alertname }} - {{ .CommonLabels.service_name }}'
        text: '{{ .CommonAnnotations.summary }}'
        fields:
          - title: Severity
            value: '{{ .CommonLabels.severity }}'
            short: true
          - title: Service
            value: '{{ .CommonLabels.service_name }}'
            short: true

  - name: slack-payments-team
    slack_configs:
      - api_url: "https://hooks.slack.com/services/YOUR/PAYMENTS/WEBHOOK"
        channel: "#team-payments-alerts"
        send_resolved: true
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
```

## Adding Trace and Log Links to Alert Annotations

The rich Slack notification above references `traces_url`, `logs_url`, and `dashboard_url` from alert annotations. You need to set these in your Prometheus alert rules:

```yaml
# prometheus-alerts.yaml
# Alert rules with deep links for Slack notifications

groups:
  - name: service-health
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_server_errors_total[5m])) by (service_name)
          / sum(rate(http_server_request_duration_count[5m])) by (service_name)
          > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Error rate is {{ $value | humanizePercentage }} on {{ $labels.service_name }}"
          description: "The 5-minute error rate has exceeded 5% for service {{ $labels.service_name }}."
          runbook_url: "https://wiki.example.com/runbooks/high-error-rate"
          # Deep links to observability tools - replace with your actual URLs
          traces_url: "https://tracing.example.com/search?service={{ $labels.service_name }}&tags=error%3Dtrue&lookback=30m"
          logs_url: "https://logs.example.com/explore?query=service%3D{{ $labels.service_name }}%20level%3Derror&from=now-30m"
          dashboard_url: "https://grafana.example.com/d/svc-overview?var-service={{ $labels.service_name }}&from=now-1h"
```

## Reducing Noise with Grouping and Inhibition

Noisy Slack channels get ignored. Use Alertmanager's grouping and inhibition features to keep notifications relevant.

```yaml
# alertmanager.yaml (partial)
# Noise reduction configuration

# Group alerts so you get one Slack message per service per issue type
# instead of one message per alert instance
route:
  group_by: [alertname, service_name]
  group_wait: 30s        # Wait 30s to batch initial alerts together
  group_interval: 5m     # Wait 5m before sending updates to a group
  repeat_interval: 4h    # Only repeat every 4 hours if still firing

# Suppress lower-severity alerts when a higher-severity alert is firing
# for the same service
inhibit_rules:
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: [service_name]
```

## Channel Routing Strategy

A practical channel strategy for most teams:

| Channel | Content | Who Monitors |
|---|---|---|
| `#alerts-critical` | P1/P2 alerts only | On-call engineer |
| `#alerts-warning` | P3/P4 alerts | Team leads during business hours |
| `#team-X-alerts` | All alerts for team X's services | Team X members |
| `#alerts-resolved` | Resolution notifications | Nobody actively, useful for audit |

To implement per-team routing, use the `team` label on your alert rules and match on it in Alertmanager's route tree. The `continue: true` flag lets an alert match multiple routes, so a critical payment service alert can go to both `#alerts-critical` and `#team-payments-alerts`.

## Testing Your Slack Notifications

Send a test alert to verify formatting before going to production:

```bash
# Send a test alert with all the annotation fields
# to verify the Slack message formatting

curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "HighErrorRate",
      "severity": "critical",
      "service_name": "payment-api",
      "team": "payments",
      "environment": "production"
    },
    "annotations": {
      "summary": "Error rate is 12% on payment-api",
      "description": "The 5-minute error rate has exceeded 5% for service payment-api.",
      "runbook_url": "https://wiki.example.com/runbooks/high-error-rate",
      "traces_url": "https://tracing.example.com/search?service=payment-api",
      "logs_url": "https://logs.example.com/explore?service=payment-api",
      "dashboard_url": "https://grafana.example.com/d/svc-overview?var-service=payment-api"
    }
  }]'
```

Check your Slack channels and confirm the message includes all the fields, deep links, and action buttons. A well-formatted alert notification means the difference between a 5-minute resolution and a 30-minute one, because the responder has everything they need without switching tools.
