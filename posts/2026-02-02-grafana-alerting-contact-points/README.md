# How to Build Grafana Alerting Contact Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Alerting, Contact Points, Notifications, Monitoring, Observability, Webhooks, Slack

Description: A hands-on guide to building and configuring Grafana alerting contact points. Learn how to set up notification channels for email, Slack, webhooks, PagerDuty, and more to ensure your team gets alerted when things go wrong.

---

Alerting without proper notification delivery is like a fire alarm that nobody hears. Grafana's contact points are the mechanism that bridges the gap between detecting an issue and notifying the right people at the right time. Whether you need to ping a Slack channel, trigger a PagerDuty incident, or send a webhook to your custom incident management system, contact points make it happen.

## Understanding Contact Points

Contact points in Grafana define where and how alert notifications are delivered. Each contact point can contain one or more integrations, allowing you to fan out notifications to multiple destinations from a single point.

```mermaid
flowchart LR
    subgraph AlertRules["Alert Rules"]
        A1[CPU High]
        A2[Memory Critical]
        A3[Error Rate Spike]
    end

    subgraph NotificationPolicy["Notification Policy"]
        B1[Route Matching]
    end

    subgraph ContactPoints["Contact Points"]
        C1[ops-team]
        C2[dev-team]
        C3[on-call]
    end

    subgraph Integrations["Integrations"]
        D1[Slack]
        D2[Email]
        D3[PagerDuty]
        D4[Webhook]
    end

    A1 --> B1
    A2 --> B1
    A3 --> B1

    B1 --> C1
    B1 --> C2
    B1 --> C3

    C1 --> D1
    C1 --> D2
    C2 --> D1
    C3 --> D3
    C3 --> D4
```

The main components involved in Grafana alerting are:

- **Alert Rules**: Define conditions that trigger alerts
- **Notification Policies**: Route alerts to specific contact points based on labels
- **Contact Points**: Define the destination and method for notifications
- **Integrations**: The actual notification channels (Slack, email, webhooks, etc.)

## Prerequisites

Before setting up contact points, ensure you have:

- Grafana 9.0 or later installed (unified alerting enabled by default)
- Admin or Editor role with alert management permissions
- Access credentials for your notification services (Slack tokens, SMTP settings, etc.)
- Basic familiarity with Grafana's alerting interface

## Creating Your First Contact Point

Navigate to Alerting in Grafana's main menu and select Contact points. Let's start with a simple email contact point.

### Email Contact Point

The email integration requires SMTP configuration in Grafana's main configuration file. Ensure your grafana.ini has proper SMTP settings configured before proceeding.

Add the SMTP configuration to your Grafana settings file:

```ini
# grafana.ini
# SMTP configuration for email notifications
[smtp]
enabled = true
host = smtp.gmail.com:587
user = alerts@yourcompany.com
password = """your-app-password"""
from_address = alerts@yourcompany.com
from_name = Grafana Alerts
startTLS_policy = MandatoryStartTLS
```

Once SMTP is configured, create an email contact point through the Grafana UI or use the provisioning API. The following YAML shows how to provision an email contact point:

```yaml
# provisioning/alerting/contact-points.yaml
# Email contact point configuration for operations team
apiVersion: 1

contactPoints:
  - orgId: 1
    name: ops-email
    receivers:
      - uid: ops-email-receiver
        type: email
        settings:
          # Semicolon-separated list of recipient addresses
          addresses: "ops@yourcompany.com;oncall@yourcompany.com"
          # Use HTML formatting for better readability
          singleEmail: false
        disableResolveMessage: false
```

### Slack Integration

Slack is one of the most popular notification channels for DevOps teams. You can use either an incoming webhook URL or a Slack bot token for integration.

#### Using Incoming Webhooks

Create a Slack incoming webhook in your Slack workspace settings. The following configuration shows how to set up a Slack contact point using webhooks:

```yaml
# provisioning/alerting/contact-points.yaml
# Slack contact point using incoming webhook
apiVersion: 1

contactPoints:
  - orgId: 1
    name: slack-alerts
    receivers:
      - uid: slack-ops-channel
        type: slack
        settings:
          # Incoming webhook URL from Slack app configuration
          url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
          # Default channel if not specified in the webhook
          recipient: "#ops-alerts"
          # Username shown as the message sender
          username: "Grafana Alerts"
          # Custom icon for alert messages
          icon_emoji: ":warning:"
          # Customize the message template
          title: |
            {{ template "slack.title" . }}
          text: |
            {{ template "slack.text" . }}
```

#### Using Slack Bot Token

For more control over message formatting and channel routing, use a Slack bot token instead of webhooks. Create a Slack app with the chat:write scope and install it to your workspace.

```yaml
# provisioning/alerting/contact-points.yaml
# Slack contact point using bot token for enhanced features
apiVersion: 1

contactPoints:
  - orgId: 1
    name: slack-bot-alerts
    receivers:
      - uid: slack-bot-receiver
        type: slack
        settings:
          # Bot token with chat:write permission
          token: "xoxb-your-slack-bot-token"
          # Channel can be ID or name (ID is more reliable)
          recipient: "C01234567890"
          # Thread replies for follow-up notifications
          mentionChannel: "here"
          # Rich formatting options
          title: |
            [{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}
          text: |
            *Summary:* {{ .CommonAnnotations.summary }}
            *Description:* {{ .CommonAnnotations.description }}
            *Severity:* {{ .CommonLabels.severity }}
```

### PagerDuty Integration

PagerDuty is essential for critical alerts that require immediate attention. Set up a PagerDuty integration key from your PagerDuty service configuration.

```yaml
# provisioning/alerting/contact-points.yaml
# PagerDuty contact point for critical incident management
apiVersion: 1

contactPoints:
  - orgId: 1
    name: pagerduty-critical
    receivers:
      - uid: pagerduty-receiver
        type: pagerduty
        settings:
          # Integration key from PagerDuty service settings
          integrationKey: "your-pagerduty-integration-key"
          # Severity mapping for PagerDuty events
          severity: "critical"
          # Custom routing key for advanced routing
          class: "infrastructure"
          # Component helps identify the source
          component: "{{ .CommonLabels.service }}"
          # Group related alerts together
          group: "{{ .CommonLabels.alertname }}"
```

### Webhook Integration

Webhooks provide flexibility to integrate with any HTTP-based service. Build custom integrations with your incident management tools, chat systems, or automation platforms.

```yaml
# provisioning/alerting/contact-points.yaml
# Generic webhook contact point for custom integrations
apiVersion: 1

contactPoints:
  - orgId: 1
    name: custom-webhook
    receivers:
      - uid: webhook-receiver
        type: webhook
        settings:
          # Your webhook endpoint URL
          url: "https://api.yourcompany.com/alerts/webhook"
          # HTTP method to use
          httpMethod: "POST"
          # Authentication header
          authorization_scheme: "Bearer"
          authorization_credentials: "your-api-token"
          # Custom headers for your API
          maxAlerts: 10
```

## Advanced Contact Point Configuration

### Multiple Integrations in One Contact Point

A single contact point can contain multiple integrations. Use this pattern when you want the same alert to reach multiple destinations simultaneously.

```yaml
# provisioning/alerting/contact-points.yaml
# Contact point with multiple integrations for redundant notification
apiVersion: 1

contactPoints:
  - orgId: 1
    name: critical-alerts
    receivers:
      # Primary notification via PagerDuty
      - uid: critical-pagerduty
        type: pagerduty
        settings:
          integrationKey: "your-pagerduty-key"
          severity: "critical"

      # Backup notification to Slack
      - uid: critical-slack
        type: slack
        settings:
          url: "https://hooks.slack.com/services/xxx/yyy/zzz"
          recipient: "#incidents"
          title: "CRITICAL ALERT"

      # Email to management for visibility
      - uid: critical-email
        type: email
        settings:
          addresses: "sre-leads@yourcompany.com"
          singleEmail: true
```

### Microsoft Teams Integration

Microsoft Teams integration uses incoming webhooks through the Office 365 connector.

```yaml
# provisioning/alerting/contact-points.yaml
# Microsoft Teams contact point configuration
apiVersion: 1

contactPoints:
  - orgId: 1
    name: teams-alerts
    receivers:
      - uid: teams-receiver
        type: teams
        settings:
          # Webhook URL from Teams incoming webhook connector
          url: "https://outlook.office.com/webhook/xxx/IncomingWebhook/yyy/zzz"
          # Message formatting
          title: |
            {{ .Status | toUpper }}: {{ .GroupLabels.alertname }}
          sectionTitle: "Alert Details"
          message: |
            {{ range .Alerts }}
            **{{ .Labels.alertname }}**
            - Status: {{ .Status }}
            - Severity: {{ .Labels.severity }}
            - Summary: {{ .Annotations.summary }}
            {{ end }}
```

### OpsGenie Integration

OpsGenie provides advanced alert management with on-call scheduling and escalation policies.

```yaml
# provisioning/alerting/contact-points.yaml
# OpsGenie contact point for alert management
apiVersion: 1

contactPoints:
  - orgId: 1
    name: opsgenie-alerts
    receivers:
      - uid: opsgenie-receiver
        type: opsgenie
        settings:
          # API key from OpsGenie integration settings
          apiKey: "your-opsgenie-api-key"
          # API URL (use EU URL for European accounts)
          apiUrl: "https://api.opsgenie.com"
          # Auto-close alerts when resolved
          autoClose: true
          # Override priority based on severity label
          overridePriority: true
          # Send additional tags
          sendTagsAs: "tags"
```

### Discord Integration

For teams using Discord, configure webhook-based notifications.

```yaml
# provisioning/alerting/contact-points.yaml
# Discord contact point using webhooks
apiVersion: 1

contactPoints:
  - orgId: 1
    name: discord-alerts
    receivers:
      - uid: discord-receiver
        type: discord
        settings:
          # Webhook URL from Discord channel settings
          url: "https://discord.com/api/webhooks/xxx/yyy"
          # Message content template
          message: |
            **{{ .Status | toUpper }}** - {{ .GroupLabels.alertname }}
            {{ range .Alerts }}
            > {{ .Annotations.summary }}
            {{ end }}
          # Avatar URL for the bot
          avatar_url: "https://grafana.com/static/img/grafana_icon.svg"
          # Whether to use Discord embeds
          use_discord_username: true
```

## Custom Message Templates

Grafana allows you to create custom notification templates for consistent and informative alert messages across all your contact points.

### Creating Custom Templates

Navigate to Alerting > Contact points > Message templates to create reusable templates.

The following template provides a comprehensive alert message format:

```go
# Custom template for detailed alert notifications
{{ define "custom.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.SortedPairs.Values | join " " }}
{{ end }}

{{ define "custom.message" }}
{{ if gt (len .Alerts.Firing) 0 }}
**Firing Alerts:**
{{ range .Alerts.Firing }}
- **{{ .Labels.alertname }}**
  - Severity: {{ .Labels.severity }}
  - Summary: {{ .Annotations.summary }}
  - Started: {{ .StartsAt.Format "2006-01-02 15:04:05 MST" }}
  {{ if .GeneratorURL }}- [View in Grafana]({{ .GeneratorURL }}){{ end }}
{{ end }}
{{ end }}

{{ if gt (len .Alerts.Resolved) 0 }}
**Resolved Alerts:**
{{ range .Alerts.Resolved }}
- **{{ .Labels.alertname }}**
  - Resolved at: {{ .EndsAt.Format "2006-01-02 15:04:05 MST" }}
{{ end }}
{{ end }}
{{ end }}
```

### Slack-Specific Template

Create rich Slack notifications with interactive elements:

```go
# Slack-optimized template with blocks and attachments
{{ define "slack.title" }}
{{ if eq .Status "firing" }}:fire:{{ else }}:white_check_mark:{{ end }} {{ .GroupLabels.alertname }}
{{ end }}

{{ define "slack.text" }}
*Environment:* {{ .CommonLabels.env | default "unknown" }}
*Cluster:* {{ .CommonLabels.cluster | default "unknown" }}

{{ if gt (len .Alerts.Firing) 0 }}
*Firing:*
{{ range .Alerts.Firing }}
> *{{ .Labels.alertname }}* - {{ .Labels.severity }}
> {{ .Annotations.summary }}
> Started: {{ .StartsAt.Format "15:04:05 MST" }}
{{ end }}
{{ end }}

{{ if gt (len .Alerts.Resolved) 0 }}
*Resolved:*
{{ range .Alerts.Resolved }}
> *{{ .Labels.alertname }}* resolved at {{ .EndsAt.Format "15:04:05 MST" }}
{{ end }}
{{ end }}
{{ end }}
```

### Email HTML Template

Create professional HTML email notifications:

```go
# HTML email template for professional notifications
{{ define "email.subject" }}
[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }} - {{ .CommonLabels.severity }}
{{ end }}

{{ define "email.html" }}
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .alert-firing { border-left: 4px solid #dc3545; padding-left: 10px; }
    .alert-resolved { border-left: 4px solid #28a745; padding-left: 10px; }
    .severity-critical { color: #dc3545; font-weight: bold; }
    .severity-warning { color: #ffc107; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
  </style>
</head>
<body>
  <h2>Grafana Alert Notification</h2>

  {{ if gt (len .Alerts.Firing) 0 }}
  <h3 class="alert-firing">Firing Alerts ({{ len .Alerts.Firing }})</h3>
  <table>
    <tr>
      <th>Alert</th>
      <th>Severity</th>
      <th>Summary</th>
      <th>Started</th>
    </tr>
    {{ range .Alerts.Firing }}
    <tr>
      <td>{{ .Labels.alertname }}</td>
      <td class="severity-{{ .Labels.severity }}">{{ .Labels.severity }}</td>
      <td>{{ .Annotations.summary }}</td>
      <td>{{ .StartsAt.Format "2006-01-02 15:04:05" }}</td>
    </tr>
    {{ end }}
  </table>
  {{ end }}

  {{ if gt (len .Alerts.Resolved) 0 }}
  <h3 class="alert-resolved">Resolved Alerts ({{ len .Alerts.Resolved }})</h3>
  <table>
    <tr>
      <th>Alert</th>
      <th>Resolved At</th>
    </tr>
    {{ range .Alerts.Resolved }}
    <tr>
      <td>{{ .Labels.alertname }}</td>
      <td>{{ .EndsAt.Format "2006-01-02 15:04:05" }}</td>
    </tr>
    {{ end }}
  </table>
  {{ end }}

  <p><a href="{{ .ExternalURL }}">View in Grafana</a></p>
</body>
</html>
{{ end }}
```

## Setting Up Notification Policies

Notification policies route alerts to the appropriate contact points based on label matching. Without proper policies, all alerts go to the default contact point.

### Basic Notification Policy

```yaml
# provisioning/alerting/notification-policies.yaml
# Notification policy routing configuration
apiVersion: 1

policies:
  - orgId: 1
    # Root policy applies to all alerts not matching child policies
    receiver: default-email
    group_by:
      - alertname
      - cluster
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:
      # Critical alerts go to PagerDuty
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        continue: true  # Also evaluate subsequent routes

      # High severity alerts go to Slack
      - receiver: slack-alerts
        matchers:
          - severity =~ "critical|high"

      # Database alerts go to DBA team
      - receiver: dba-team
        matchers:
          - team = database
        group_by:
          - alertname
          - database

      # Development environment alerts
      - receiver: dev-slack
        matchers:
          - env = development
        repeat_interval: 24h  # Less frequent for dev
```

### Nested Routing for Complex Scenarios

```yaml
# provisioning/alerting/notification-policies.yaml
# Complex nested routing for multi-team organizations
apiVersion: 1

policies:
  - orgId: 1
    receiver: fallback-email
    group_by:
      - namespace
    routes:
      # Platform team routing
      - receiver: platform-oncall
        matchers:
          - team = platform
        routes:
          - receiver: platform-pagerduty
            matchers:
              - severity = critical
            mute_time_intervals:
              - maintenance-window

          - receiver: platform-slack
            matchers:
              - severity =~ "warning|info"

      # Application team routing
      - receiver: app-team-default
        matchers:
          - team = applications
        routes:
          - receiver: app-pagerduty
            matchers:
              - severity = critical
              - service =~ "payment|auth"

          - receiver: app-slack
            matchers:
              - severity != critical
```

## Testing Contact Points

Before relying on contact points in production, test them thoroughly.

### Test via Grafana UI

Navigate to Alerting > Contact points, click the three-dot menu on your contact point, and select "Test". Grafana sends a test notification to verify connectivity.

### Test via API

Use the Grafana API to test contact points programmatically:

```bash
# Test a contact point using the Grafana API
# Replace with your Grafana URL and API key
curl -X POST \
  'http://localhost:3000/api/alertmanager/grafana/config/api/v1/receivers/test' \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "receivers": [{
      "name": "slack-alerts",
      "grafana_managed_receiver_configs": [{
        "uid": "slack-ops-channel",
        "name": "slack-ops-channel",
        "type": "slack",
        "settings": {
          "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
          "recipient": "#ops-alerts"
        }
      }]
    }],
    "alert": {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning"
      },
      "annotations": {
        "summary": "Test alert from API"
      }
    }
  }'
```

### Test with Test Alerts

Create a test alert rule that always fires to validate your entire alerting pipeline:

```yaml
# provisioning/alerting/rules.yaml
# Test alert rule for validating contact points
apiVersion: 1

groups:
  - orgId: 1
    name: test-alerts
    folder: Testing
    interval: 1m
    rules:
      - uid: test-alert-always-firing
        title: Test Alert - Always Firing
        condition: A
        data:
          - refId: A
            datasourceUid: __expr__
            model:
              type: math
              expression: "1 > 0"
        for: 0s
        annotations:
          summary: "Test alert for validating contact points"
        labels:
          severity: info
          team: testing
```

## Mute Timings

Prevent alert noise during maintenance windows or known downtime periods.

### Creating Mute Timings

```yaml
# provisioning/alerting/mute-timings.yaml
# Mute timing configurations for maintenance windows
apiVersion: 1

muteTimes:
  - orgId: 1
    name: maintenance-window
    time_intervals:
      # Every Sunday from 2 AM to 6 AM UTC
      - weekdays:
          - sunday
        times:
          - start_time: "02:00"
            end_time: "06:00"
        location: UTC

  - orgId: 1
    name: business-hours-only
    time_intervals:
      # Outside business hours (Mon-Fri 9-18)
      - weekdays:
          - saturday
          - sunday
      - weekdays:
          - monday:friday
        times:
          - start_time: "00:00"
            end_time: "09:00"
          - start_time: "18:00"
            end_time: "23:59"
        location: America/New_York

  - orgId: 1
    name: quarterly-maintenance
    time_intervals:
      # First Saturday of each quarter
      - months:
          - january
          - april
          - july
          - october
        days_of_month:
          - "1:7"
        weekdays:
          - saturday
        times:
          - start_time: "00:00"
            end_time: "08:00"
```

### Applying Mute Timings to Routes

```yaml
# provisioning/alerting/notification-policies.yaml
# Apply mute timings to notification routes
apiVersion: 1

policies:
  - orgId: 1
    receiver: default
    routes:
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        # Mute during maintenance but still send to Slack
        mute_time_intervals:
          - maintenance-window
        routes:
          # Emergency bypass - never muted
          - receiver: emergency-pagerduty
            matchers:
              - bypass_mute = true
            mute_time_intervals: []

      - receiver: slack-non-critical
        matchers:
          - severity != critical
        # Only alert during business hours
        active_time_intervals:
          - business-hours-only
```

## Webhook Payload Format

When building custom webhook integrations, understanding the payload format is essential.

### Standard Webhook Payload

Grafana sends the following JSON structure to webhook endpoints:

```json
{
  "receiver": "webhook-receiver",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighCPUUsage",
        "severity": "critical",
        "instance": "server-01",
        "job": "node-exporter"
      },
      "annotations": {
        "summary": "CPU usage is above 90%",
        "description": "Server server-01 has CPU usage of 95%",
        "runbook_url": "https://wiki.example.com/runbooks/high-cpu"
      },
      "startsAt": "2024-01-15T10:30:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://grafana:3000/alerting/grafana/abc123/view",
      "fingerprint": "abc123def456",
      "silenceURL": "http://grafana:3000/alerting/silence/new?alertmanager=grafana",
      "dashboardURL": "http://grafana:3000/d/xyz789",
      "panelURL": "http://grafana:3000/d/xyz789?viewPanel=1",
      "values": {
        "A": 95.5
      }
    }
  ],
  "groupLabels": {
    "alertname": "HighCPUUsage"
  },
  "commonLabels": {
    "alertname": "HighCPUUsage",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "CPU usage is above 90%"
  },
  "externalURL": "http://grafana:3000",
  "version": "1",
  "groupKey": "{}:{alertname=\"HighCPUUsage\"}",
  "truncatedAlerts": 0,
  "title": "[FIRING:1] HighCPUUsage critical",
  "state": "alerting",
  "message": "**Firing**\n\nValue: A=95.5\nLabels:\n - alertname = HighCPUUsage\n"
}
```

### Custom Webhook Handler Example

Build a custom webhook handler to process Grafana alerts:

```python
# webhook_handler.py
# Custom webhook handler for Grafana alert notifications
from flask import Flask, request, jsonify
import logging
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/alerts/webhook', methods=['POST'])
def handle_alert():
    """
    Process incoming Grafana alert webhooks and perform custom actions.

    Expected payload structure follows the Grafana alertmanager webhook format.
    """
    try:
        payload = request.json
        logger.info(f"Received alert webhook: {payload.get('status')}")

        # Extract key information from the payload
        status = payload.get('status', 'unknown')
        alerts = payload.get('alerts', [])

        for alert in alerts:
            alert_name = alert.get('labels', {}).get('alertname', 'Unknown')
            severity = alert.get('labels', {}).get('severity', 'info')
            summary = alert.get('annotations', {}).get('summary', '')
            starts_at = alert.get('startsAt', '')

            # Log the alert details
            logger.info(
                f"Alert: {alert_name}, Severity: {severity}, "
                f"Status: {alert.get('status')}, Summary: {summary}"
            )

            # Perform custom actions based on severity
            if severity == 'critical' and alert.get('status') == 'firing':
                # Create incident in your system
                create_incident(alert)

            elif alert.get('status') == 'resolved':
                # Auto-resolve incident
                resolve_incident(alert)

        return jsonify({'status': 'received'}), 200

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500


def create_incident(alert):
    """Create an incident in your incident management system."""
    logger.info(f"Creating incident for: {alert.get('labels', {}).get('alertname')}")
    # Implement your incident creation logic here
    pass


def resolve_incident(alert):
    """Resolve an existing incident."""
    logger.info(f"Resolving incident for: {alert.get('labels', {}).get('alertname')}")
    # Implement your incident resolution logic here
    pass


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Troubleshooting Contact Points

### Common Issues and Solutions

**Notifications not being sent:**

```bash
# Check Grafana logs for alerting errors
docker logs grafana 2>&1 | grep -i "alert\|notification"

# Verify contact point configuration
curl -s -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/alertmanager/grafana/config/api/v1/receivers \
  | jq '.[] | select(.name == "your-contact-point")'
```

**Slack webhooks failing:**

```bash
# Test Slack webhook directly
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from curl"}' \
  'https://hooks.slack.com/services/xxx/yyy/zzz'

# Check for rate limiting or invalid webhook URL
# Slack webhooks should return "ok" on success
```

**Email notifications not delivered:**

```ini
# grafana.ini - Enable SMTP debug logging
[smtp]
enabled = true
host = smtp.gmail.com:587
# ... other settings
skip_verify = false

[log]
filters = smtp:debug
```

**Webhook timeouts:**

```yaml
# Increase timeout for slow endpoints
contactPoints:
  - name: slow-webhook
    receivers:
      - type: webhook
        settings:
          url: "https://slow-api.example.com/alerts"
          # Grafana default timeout is 10s
          # Consider optimizing your endpoint instead
```

### Debugging Notification Flow

Use Grafana's alerting state history to trace notification delivery:

```mermaid
flowchart TD
    A[Alert Fires] --> B{Notification Policy Match}
    B -->|Match Found| C[Select Contact Point]
    B -->|No Match| D[Use Default Contact Point]
    C --> E{Mute Timing Active?}
    D --> E
    E -->|Yes| F[Alert Muted]
    E -->|No| G[Send Notification]
    G --> H{Delivery Success?}
    H -->|Yes| I[Notification Delivered]
    H -->|No| J[Retry Logic]
    J --> K{Retries Exhausted?}
    K -->|No| G
    K -->|Yes| L[Mark as Failed]
```

Navigate to Alerting > Alert rules, select your alert, and view the "State history" tab to see notification attempts and their outcomes.

## Best Practices

### Organize Contact Points by Team

Structure your contact points around team ownership:

```yaml
contactPoints:
  # Platform team contacts
  - name: platform-critical
    receivers:
      - type: pagerduty
        settings:
          integrationKey: platform-pd-key
      - type: slack
        settings:
          recipient: "#platform-incidents"

  - name: platform-warning
    receivers:
      - type: slack
        settings:
          recipient: "#platform-alerts"

  # Application team contacts
  - name: app-team-critical
    receivers:
      - type: pagerduty
        settings:
          integrationKey: app-team-pd-key

  - name: app-team-warning
    receivers:
      - type: slack
        settings:
          recipient: "#app-team-alerts"
```

### Use Consistent Labeling

Adopt consistent label naming for effective routing:

```yaml
# Alert rule example with routing labels
rules:
  - uid: high-cpu-alert
    title: High CPU Usage
    labels:
      team: platform
      severity: warning
      service: compute
      env: production
```

### Implement Escalation Chains

Create escalation by combining multiple contact points with different intervals:

```yaml
policies:
  - receiver: slack-first-responders
    group_wait: 30s
    repeat_interval: 15m
    routes:
      # After 30 minutes, escalate to PagerDuty
      - receiver: pagerduty-oncall
        matchers:
          - severity = critical
        repeat_interval: 30m
        routes:
          # After 1 hour, page management
          - receiver: management-escalation
            repeat_interval: 1h
```

### Document Your Contact Points

Maintain documentation for your alerting configuration:

```yaml
# contact-points-documentation.yaml
# Documentation file - not processed by Grafana
contact_points:
  - name: platform-critical
    description: "Critical alerts for the platform team"
    owner: "@platform-oncall"
    escalation: "Pages on-call engineer via PagerDuty"
    response_time: "15 minutes"
    runbook: "https://wiki.example.com/platform-oncall"

  - name: app-team-warning
    description: "Non-critical alerts for application team"
    owner: "@app-team"
    escalation: "Slack notification, reviewed during business hours"
    response_time: "Next business day"
```

## Conclusion

Contact points form the critical link between alert detection and incident response. A well-designed contact point strategy ensures that the right people receive the right information at the right time.

Key takeaways from this guide:

1. **Start simple**: Begin with basic email or Slack contact points and expand as needed. You can always add more integrations later.

2. **Test thoroughly**: Always test contact points before relying on them for production alerts. Use Grafana's built-in test functionality and create test alerts.

3. **Use notification policies wisely**: Route alerts based on severity, team ownership, and environment to avoid alert fatigue.

4. **Leverage mute timings**: Prevent unnecessary noise during maintenance windows while ensuring critical alerts still reach the right people.

5. **Document everything**: Keep track of who owns which contact points and what the expected response procedures are.

6. **Monitor your monitoring**: Regularly verify that notifications are being delivered by reviewing state history and setting up watchdog alerts.

Effective alerting is about more than just sending notifications. Your contact point configuration should reflect your organization's incident response procedures and ensure that alerts lead to action rather than being ignored.
