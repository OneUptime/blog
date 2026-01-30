# How to Build Grafana Alert Contact Points

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Alerting, Contact Points, Notifications

Description: A comprehensive guide to configuring Grafana alert contact points for effective incident notification across multiple channels including email, Slack, PagerDuty, and webhooks.

---

## What Are Grafana Contact Points?

Contact points in Grafana define where and how alert notifications are sent when an alert rule fires. They are a fundamental component of the Grafana Alerting system, enabling teams to receive timely notifications through various channels such as email, Slack, Microsoft Teams, PagerDuty, webhooks, and many more.

Think of contact points as the delivery mechanism for your alerts. While alert rules define the conditions that trigger an alert, contact points determine who gets notified and through which medium.

---

## Grafana Alerting Architecture

Before diving into contact point configuration, it helps to understand how Grafana's alerting system works as a whole.

```mermaid
flowchart TB
    subgraph Data Sources
        DS1[Prometheus]
        DS2[InfluxDB]
        DS3[Loki]
    end

    subgraph Alert Rules
        AR[Alert Rule Engine]
        AR -->|Evaluates| Q[Query Results]
    end

    subgraph Alert Manager
        AM[Alertmanager]
        AM -->|Routes to| CP[Contact Points]
        AM -->|Groups by| NP[Notification Policies]
    end

    subgraph Contact Points
        CP -->|Sends to| Email[Email]
        CP -->|Sends to| Slack[Slack]
        CP -->|Sends to| PD[PagerDuty]
        CP -->|Sends to| WH[Webhook]
        CP -->|Sends to| Teams[MS Teams]
    end

    DS1 --> AR
    DS2 --> AR
    DS3 --> AR
    Q -->|Threshold Breached| AM
```

The flow works as follows:

1. **Data Sources** provide metrics, logs, or traces
2. **Alert Rules** query these sources and evaluate conditions
3. **Alertmanager** receives firing alerts and applies routing
4. **Notification Policies** determine which contact point handles which alerts
5. **Contact Points** deliver notifications to configured channels

---

## Creating Your First Contact Point

### Via the Grafana UI

Navigate to **Alerting** > **Contact points** in the Grafana sidebar. Click **+ Add contact point** to create a new one.

Every contact point requires:
- **Name**: A unique identifier for the contact point
- **Integration type**: The notification channel (email, Slack, etc.)
- **Integration-specific settings**: Credentials and configuration for the chosen channel

### Via Provisioning (Infrastructure as Code)

For teams practicing GitOps, provisioning contact points through configuration files is the preferred approach. Create a YAML file in your Grafana provisioning directory.

```yaml
# /etc/grafana/provisioning/alerting/contact-points.yaml
apiVersion: 1

contactPoints:
  - orgId: 1
    name: operations-team
    receivers:
      - uid: email-ops
        type: email
        settings:
          addresses: ops@company.com;oncall@company.com
          singleEmail: false
        disableResolveMessage: false
      - uid: slack-ops
        type: slack
        settings:
          recipient: "#ops-alerts"
          token: $SLACK_BOT_TOKEN
          mentionChannel: here
```

---

## Email Contact Point Configuration

Email remains one of the most reliable notification channels. Here is how to configure it properly.

### Basic Email Setup

```yaml
contactPoints:
  - orgId: 1
    name: email-notifications
    receivers:
      - uid: primary-email
        type: email
        settings:
          addresses: alerts@company.com
          singleEmail: true
          message: |
            Alert: {{ .CommonLabels.alertname }}
            Status: {{ .Status }}

            {{ range .Alerts }}
            Summary: {{ .Annotations.summary }}
            Description: {{ .Annotations.description }}
            {{ end }}
```

### Email Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `addresses` | Semicolon-separated email addresses | Required |
| `singleEmail` | Send one email for all alerts or one per alert | `false` |
| `message` | Custom email body using Go templating | Default template |
| `subject` | Custom email subject line | Alert notification |

### SMTP Configuration in grafana.ini

Ensure your Grafana instance has SMTP configured:

```ini
[smtp]
enabled = true
host = smtp.company.com:587
user = grafana@company.com
password = $__file{/etc/grafana/smtp-password}
from_address = grafana@company.com
from_name = Grafana Alerts
starttls_policy = MandatoryStartTLS
```

---

## Slack Integration

Slack is the most popular integration for development and operations teams. Grafana supports both incoming webhooks and the Slack Bot API.

### Using Slack Bot Token (Recommended)

```yaml
contactPoints:
  - orgId: 1
    name: slack-alerts
    receivers:
      - uid: slack-main
        type: slack
        settings:
          recipient: "#alerts-production"
          token: $SLACK_BOT_TOKEN
          username: Grafana Alert Bot
          icon_emoji: ":grafana:"
          mentionUsers: U024HQXF2,U034KLMN1
          mentionGroups: S04HQXF2P
          mentionChannel: here
          endpointUrl: ""
          text: |
            {{ range .Alerts }}
            *Alert:* {{ .Labels.alertname }}
            *Severity:* {{ .Labels.severity }}
            *Summary:* {{ .Annotations.summary }}
            {{ end }}
```

### Setting Up a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **OAuth & Permissions**, add these scopes:
   - `chat:write`
   - `chat:write.public` (for posting to public channels without joining)
3. Install the app to your workspace
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Slack Message Flow

```mermaid
sequenceDiagram
    participant G as Grafana
    participant AM as Alertmanager
    participant S as Slack API
    participant C as #alerts Channel

    G->>AM: Alert fires
    AM->>AM: Apply notification policy
    AM->>S: POST /api/chat.postMessage
    S->>S: Authenticate bot token
    S->>C: Deliver message
    C-->>AM: 200 OK
    AM-->>G: Notification sent
```

### Using Incoming Webhooks (Legacy)

If you cannot create a Slack app, use incoming webhooks:

```yaml
receivers:
  - uid: slack-webhook
    type: slack
    settings:
      url: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
      recipient: "#alerts"
```

Note: Webhooks have limitations including no user/group mentions and reduced customization options.

---

## PagerDuty Integration

PagerDuty is essential for on-call rotations and incident management. Grafana supports both Events API v2 and the legacy integration.

### Events API v2 Configuration

```yaml
contactPoints:
  - orgId: 1
    name: pagerduty-critical
    receivers:
      - uid: pd-production
        type: pagerduty
        settings:
          integrationKey: $PAGERDUTY_INTEGRATION_KEY
          severity: critical
          class: infrastructure
          component: "{{ .CommonLabels.service }}"
          group: "{{ .CommonLabels.team }}"
          summary: "{{ .CommonAnnotations.summary }}"
          source: grafana-production
          client: Grafana
          clientURL: https://grafana.company.com
          details:
            environment: production
            region: "{{ .CommonLabels.region }}"
```

### Creating a PagerDuty Integration Key

1. In PagerDuty, navigate to **Services** > **Service Directory**
2. Select or create a service
3. Go to the **Integrations** tab
4. Click **+ Add Integration**
5. Search for "Events API v2" and add it
6. Copy the **Integration Key**

### Severity Mapping

Map your alert labels to PagerDuty severity levels:

| Grafana Label | PagerDuty Severity | Description |
|---------------|-------------------|-------------|
| `critical` | critical | Immediate action required |
| `high` | error | Significant impact |
| `medium` | warning | Potential issue |
| `low` | info | Informational |

```yaml
settings:
  severity: "{{ .CommonLabels.severity | default \"warning\" }}"
```

---

## Webhook Configuration

Webhooks provide maximum flexibility for custom integrations. They send alert data as JSON to any HTTP endpoint.

### Basic Webhook Setup

```yaml
contactPoints:
  - orgId: 1
    name: custom-webhook
    receivers:
      - uid: webhook-main
        type: webhook
        settings:
          url: https://api.company.com/grafana-alerts
          httpMethod: POST
          username: grafana
          password: $WEBHOOK_PASSWORD
          authorization_scheme: Basic
          maxAlerts: 10
```

### Webhook Payload Structure

Grafana sends alerts in the following JSON format:

```json
{
  "receiver": "custom-webhook",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighCPUUsage",
        "severity": "warning",
        "instance": "server-01"
      },
      "annotations": {
        "summary": "CPU usage above 80%",
        "description": "Server server-01 has CPU usage of 92%"
      },
      "startsAt": "2026-01-30T10:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://grafana.company.com/alerting/grafana/abc123/view",
      "fingerprint": "d2b5a7c1e3f4a6b8",
      "silenceURL": "https://grafana.company.com/alerting/silence/new?alertmanager=grafana&matcher=alertname%3DHighCPUUsage",
      "dashboardURL": "https://grafana.company.com/d/abc123",
      "panelURL": "https://grafana.company.com/d/abc123?viewPanel=1",
      "values": {
        "B": 92.5
      }
    }
  ],
  "groupLabels": {
    "alertname": "HighCPUUsage"
  },
  "commonLabels": {
    "alertname": "HighCPUUsage",
    "severity": "warning"
  },
  "commonAnnotations": {
    "summary": "CPU usage above 80%"
  },
  "externalURL": "https://grafana.company.com/",
  "version": "1",
  "groupKey": "{}:{alertname=\"HighCPUUsage\"}",
  "truncatedAlerts": 0,
  "orgId": 1,
  "title": "[FIRING:1] HighCPUUsage",
  "state": "alerting",
  "message": "CPU usage above 80%"
}
```

### Example Webhook Receiver (Node.js)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/grafana-alerts', (req, res) => {
  const { status, alerts, commonLabels } = req.body;

  console.log(`Received ${status} alert: ${commonLabels.alertname}`);

  alerts.forEach(alert => {
    const { labels, annotations, startsAt } = alert;

    // Process each alert
    console.log(`
      Alert: ${labels.alertname}
      Severity: ${labels.severity}
      Summary: ${annotations.summary}
      Started: ${startsAt}
    `);

    // Implement your custom logic here
    // - Create tickets in issue tracker
    // - Trigger automation workflows
    // - Update status pages
    // - Send to custom notification systems
  });

  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook receiver listening on port 3000');
});
```

---

## Microsoft Teams Integration

Microsoft Teams requires an incoming webhook connector or the newer Workflows approach.

### Using Incoming Webhook

```yaml
contactPoints:
  - orgId: 1
    name: teams-alerts
    receivers:
      - uid: teams-main
        type: teams
        settings:
          url: https://company.webhook.office.com/webhookb2/xxx/IncomingWebhook/yyy/zzz
          title: "Grafana Alert: {{ .CommonLabels.alertname }}"
          sectionTitle: Alert Details
          message: |
            **Status:** {{ .Status }}
            **Severity:** {{ .CommonLabels.severity }}

            {{ range .Alerts }}
            **Summary:** {{ .Annotations.summary }}
            **Description:** {{ .Annotations.description }}
            {{ end }}
```

### Creating a Teams Webhook

1. In Microsoft Teams, go to the channel where you want alerts
2. Click the three dots (...) next to the channel name
3. Select **Connectors** (or **Workflows** in newer versions)
4. Find **Incoming Webhook** and click **Configure**
5. Give it a name and optional icon
6. Copy the webhook URL

---

## OpsGenie Integration

OpsGenie provides robust incident management capabilities.

```yaml
contactPoints:
  - orgId: 1
    name: opsgenie-alerts
    receivers:
      - uid: opsgenie-main
        type: opsgenie
        settings:
          apiKey: $OPSGENIE_API_KEY
          apiUrl: https://api.opsgenie.com
          message: "{{ .CommonLabels.alertname }}"
          description: "{{ .CommonAnnotations.description }}"
          autoClose: true
          overridePriority: true
          sendTagsAs: tags
          responders:
            - type: team
              name: platform-team
            - type: user
              username: oncall@company.com
```

---

## Notification Templates

Grafana allows you to create reusable notification templates that can be shared across contact points.

### Creating a Template

```yaml
# /etc/grafana/provisioning/alerting/templates.yaml
apiVersion: 1

templates:
  - orgId: 1
    name: custom-templates
    template: |
      {{ define "alert.title" }}
      [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}
      {{ end }}

      {{ define "alert.message" }}
      {{ range .Alerts }}
      {{ if .Annotations.summary }}Summary: {{ .Annotations.summary }}{{ end }}
      {{ if .Annotations.description }}Description: {{ .Annotations.description }}{{ end }}
      Labels:
      {{ range .Labels.SortedPairs }}  - {{ .Name }}: {{ .Value }}
      {{ end }}
      {{ if .DashboardURL }}Dashboard: {{ .DashboardURL }}{{ end }}
      {{ if .PanelURL }}Panel: {{ .PanelURL }}{{ end }}
      {{ end }}
      {{ end }}

      {{ define "slack.color" }}
      {{ if eq .Status "firing" }}{{ if eq .CommonLabels.severity "critical" }}#FF0000{{ else }}#FFA500{{ end }}{{ else }}#00FF00{{ end }}
      {{ end }}
```

### Using Templates in Contact Points

```yaml
contactPoints:
  - orgId: 1
    name: templated-slack
    receivers:
      - uid: slack-templated
        type: slack
        settings:
          recipient: "#alerts"
          token: $SLACK_BOT_TOKEN
          title: '{{ template "alert.title" . }}'
          text: '{{ template "alert.message" . }}'
          color: '{{ template "slack.color" . }}'
```

---

## Notification Policies

Contact points alone do not determine where alerts go. Notification policies route alerts to the appropriate contact points based on labels.

```mermaid
flowchart TD
    A[Incoming Alert] --> B{Root Policy}
    B -->|Default| C[ops-team Contact Point]
    B -->|team=platform| D{Platform Policy}
    B -->|team=security| E{Security Policy}

    D -->|severity=critical| F[pagerduty-platform]
    D -->|severity=warning| G[slack-platform]
    D -->|Default| G

    E -->|Any| H[security-oncall]

    subgraph Grouping
        I[group_by: alertname, cluster]
        J[group_wait: 30s]
        K[group_interval: 5m]
        L[repeat_interval: 4h]
    end
```

### Policy Configuration

```yaml
# /etc/grafana/provisioning/alerting/policies.yaml
apiVersion: 1

policies:
  - orgId: 1
    receiver: ops-team
    group_by:
      - alertname
      - cluster
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h
    routes:
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        continue: false
        group_wait: 0s

      - receiver: slack-platform
        matchers:
          - team = platform
        continue: true

      - receiver: slack-security
        matchers:
          - team = security
        continue: false
```

### Policy Timing Parameters

| Parameter | Description | Recommendation |
|-----------|-------------|----------------|
| `group_wait` | Time to wait before sending first notification for a group | 30s for batching, 0s for urgent alerts |
| `group_interval` | Time between notifications for a group | 5m is a good default |
| `repeat_interval` | Time before re-sending an active alert | 4h to avoid fatigue |

---

## Testing Contact Points

Always test your contact points before relying on them for production alerts.

### Using the Test Button

In the Grafana UI, each contact point has a **Test** button that sends a sample notification. This uses default test data.

### Using the API

```bash
curl -X POST \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "receivers": [{
      "name": "test-receiver",
      "grafana_managed_receiver_configs": [{
        "uid": "test",
        "name": "test",
        "type": "slack",
        "settings": {
          "recipient": "#test-alerts",
          "token": "xoxb-xxx"
        }
      }]
    }],
    "alert": {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning"
      },
      "annotations": {
        "summary": "This is a test alert"
      }
    }
  }' \
  https://grafana.company.com/api/alertmanager/grafana/config/api/v1/receivers/test
```

---

## Multiple Receivers per Contact Point

A single contact point can have multiple receivers, allowing you to notify multiple channels simultaneously.

```yaml
contactPoints:
  - orgId: 1
    name: critical-alerts-multi
    receivers:
      # Primary: PagerDuty for immediate response
      - uid: critical-pd
        type: pagerduty
        settings:
          integrationKey: $PD_KEY
          severity: critical

      # Secondary: Slack for visibility
      - uid: critical-slack
        type: slack
        settings:
          recipient: "#incidents"
          token: $SLACK_TOKEN
          mentionChannel: channel

      # Tertiary: Email for record-keeping
      - uid: critical-email
        type: email
        settings:
          addresses: incidents@company.com
          singleEmail: true
```

```mermaid
flowchart LR
    A[Critical Alert] --> CP[critical-alerts-multi Contact Point]
    CP --> R1[PagerDuty Receiver]
    CP --> R2[Slack Receiver]
    CP --> R3[Email Receiver]

    R1 --> P[Pages On-Call]
    R2 --> S[#incidents Channel]
    R3 --> E[incidents@company.com]
```

---

## Handling Alert Resolution

By default, Grafana sends resolution notifications when alerts return to normal. You can control this behavior per receiver.

```yaml
receivers:
  - uid: slack-main
    type: slack
    settings:
      recipient: "#alerts"
      token: $SLACK_TOKEN
    disableResolveMessage: false  # Send resolution (default)

  - uid: pagerduty-main
    type: pagerduty
    settings:
      integrationKey: $PD_KEY
    disableResolveMessage: false  # Auto-resolve incidents

  - uid: email-logs
    type: email
    settings:
      addresses: alert-logs@company.com
    disableResolveMessage: true   # Only log firing alerts
```

---

## Best Practices

### 1. Layer Your Notifications by Severity

```yaml
# Critical: PagerDuty + Slack + Email
# Warning: Slack only
# Info: Email digest only
```

### 2. Use Meaningful Names

```yaml
# Good
name: platform-team-production-critical

# Bad
name: contact-point-1
```

### 3. Include Runbook Links

```yaml
annotations:
  runbook_url: https://wiki.company.com/runbooks/{{ .Labels.alertname }}
```

Then reference in your template:

```yaml
{{ if .Annotations.runbook_url }}
Runbook: {{ .Annotations.runbook_url }}
{{ end }}
```

### 4. Set Up Fallback Contact Points

Configure a default contact point that catches any alerts not matched by specific policies.

### 5. Monitor Your Alerting Pipeline

Set up alerts for your alerting system:

```yaml
# Alert if notifications are failing
- alert: AlertmanagerNotificationsFailing
  expr: rate(alertmanager_notifications_failed_total[5m]) > 0
  labels:
    severity: critical
  annotations:
    summary: Alertmanager failing to send notifications
```

### 6. Use Secrets Management

Never hardcode credentials in configuration files:

```yaml
# Good: Use environment variables
token: $SLACK_BOT_TOKEN

# Bad: Hardcoded secrets
token: xoxb-1234567890-abcdefghijk
```

---

## Troubleshooting Common Issues

### Notifications Not Being Sent

1. Check the Alertmanager logs:
```bash
kubectl logs -n monitoring grafana-xxx | grep -i alert
```

2. Verify the contact point test works in the UI

3. Check notification policies are routing correctly

4. Ensure network connectivity to external services

### Duplicate Notifications

1. Review `group_interval` and `repeat_interval` settings
2. Check if multiple policies match the same alerts
3. Verify `continue: false` is set appropriately in policy routes

### Missing Labels in Notifications

1. Ensure labels are being set in alert rules
2. Check template syntax for correct label references
3. Use `{{ .Labels | json }}` to debug available labels

### Webhook Timeouts

1. Increase timeout settings if needed
2. Ensure your webhook endpoint responds quickly (under 10 seconds)
3. Implement async processing in your webhook receiver

---

## Complete Example: Production Setup

Here is a complete example combining everything discussed:

```yaml
# /etc/grafana/provisioning/alerting/alerting.yaml
apiVersion: 1

templates:
  - orgId: 1
    name: production-templates
    template: |
      {{ define "custom.title" }}
      [{{ .Status | toUpper }}] {{ .CommonLabels.alertname }} - {{ .CommonLabels.environment }}
      {{ end }}

contactPoints:
  - orgId: 1
    name: production-critical
    receivers:
      - uid: prod-pd
        type: pagerduty
        settings:
          integrationKey: $PD_PROD_KEY
          severity: critical
          source: grafana-prod
      - uid: prod-slack
        type: slack
        settings:
          recipient: "#prod-incidents"
          token: $SLACK_TOKEN
          mentionChannel: channel
          title: '{{ template "custom.title" . }}'

  - orgId: 1
    name: production-warning
    receivers:
      - uid: warn-slack
        type: slack
        settings:
          recipient: "#prod-alerts"
          token: $SLACK_TOKEN

  - orgId: 1
    name: staging-all
    receivers:
      - uid: staging-slack
        type: slack
        settings:
          recipient: "#staging-alerts"
          token: $SLACK_TOKEN

policies:
  - orgId: 1
    receiver: production-warning
    group_by:
      - alertname
      - environment
    routes:
      - receiver: production-critical
        matchers:
          - severity = critical
          - environment = production
        group_wait: 0s

      - receiver: production-warning
        matchers:
          - environment = production

      - receiver: staging-all
        matchers:
          - environment = staging
```

---

## Conclusion

Grafana contact points are a powerful mechanism for routing alerts to the right people through the right channels. By combining contact points with notification policies and templates, you can build a sophisticated alerting system that reduces noise, ensures critical issues get immediate attention, and keeps your team informed without causing alert fatigue.

Key takeaways:

- Use provisioning for version-controlled, reproducible configurations
- Layer notifications by severity to prevent fatigue
- Test contact points thoroughly before relying on them
- Monitor your alerting pipeline to catch delivery failures
- Keep credentials secure using environment variables or secrets management

With these practices in place, your Grafana alerting system will be a reliable foundation for incident response and operational awareness.
