# How to Implement On-Call Integration with Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OnCall, Incident Management, Alerting, PagerDuty, Opsgenie, SRE

Description: Learn how to connect Grafana alerting with on-call management systems for effective incident response, including Grafana OnCall setup and third-party integrations.

---

## Why Integrate On-Call with Grafana?

Alerts without proper routing are just noise. When your monitoring detects an issue at 3 AM, someone needs to be notified, acknowledge the problem, and take action. On-call integration connects your Grafana alerts to the people who can fix them.

Effective on-call integration provides:
- Automatic alert routing based on service ownership
- Escalation when alerts are not acknowledged
- Schedule management for rotation fairness
- Incident tracking for post-mortems

## Grafana OnCall Overview

Grafana OnCall is a built-in incident management solution that integrates natively with Grafana Alerting. It handles:

- Alert grouping and deduplication
- On-call schedules and rotations
- Multi-channel notifications (Slack, phone, SMS, email)
- Escalation policies

### Enabling Grafana OnCall

In Grafana Cloud, OnCall is available by default. For self-hosted Grafana, you can deploy Grafana OnCall separately:

```bash
# Using Docker Compose
git clone https://github.com/grafana/oncall.git
cd oncall
docker compose up -d
```

Or via Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install oncall grafana/oncall -n oncall --create-namespace
```

## Setting Up Grafana OnCall

### Step 1: Create Integration

Integrations define how alerts enter OnCall.

1. Navigate to OnCall > Integrations
2. Click "New integration"
3. Select "Grafana Alerting" as the type
4. Name it (e.g., "Production Alerts")

You will receive a webhook URL to use in Grafana Alerting contact points.

### Step 2: Configure Contact Point

In Grafana Alerting, create a contact point that sends to OnCall:

```yaml
# Contact point configuration
Name: Production OnCall
Type: Grafana OnCall
Integration URL: https://oncall.example.com/integrations/v1/grafana/abc123/
```

### Step 3: Create Notification Policy

Route alerts to the appropriate contact point:

```yaml
# Notification policy
Root Policy:
  Default contact point: Production OnCall

Nested Policies:
  - Matcher: team = "platform"
    Contact point: Platform OnCall

  - Matcher: team = "payments"
    Contact point: Payments OnCall

  - Matcher: severity = "critical"
    Continue: true
    Contact point: All Hands
```

## Configuring Schedules

On-call schedules define who is available when.

### Creating a Rotation

1. Go to OnCall > Schedules
2. Click "Create schedule"
3. Configure the rotation:

```yaml
Schedule: Platform Primary
Rotation Type: Weekly
Start Time: Monday 09:00 UTC
Handoff Time: Monday 09:00 UTC

Users in Rotation:
  - Alice
  - Bob
  - Charlie
  - Dana

Override Rules:
  - Holidays: Skip
  - Vacations: Next person in rotation
```

### Multi-Layer Schedules

Create backup coverage with multiple layers:

```yaml
Schedule: Platform On-Call

Layers:
  - Name: Primary
    Rotation: Weekly
    Users: [Alice, Bob, Charlie]

  - Name: Secondary
    Rotation: Weekly
    Users: [Dana, Eve, Frank]
    Offset: 1 week  # Different person than primary

  - Name: Manager Override
    Type: Override
    Users: [Grace]
    # Manual overrides for specific times
```

## Escalation Policies

Escalation policies ensure alerts do not go unacknowledged.

### Creating an Escalation Chain

```yaml
Escalation Policy: Platform Critical

Steps:
  - Step 1:
      Action: Notify on-call from schedule
      Schedule: Platform Primary
      Wait: 5 minutes

  - Step 2:
      Action: Notify on-call from schedule
      Schedule: Platform Secondary
      Wait: 10 minutes

  - Step 3:
      Action: Notify specific users
      Users: [Platform Manager]
      Wait: 15 minutes

  - Step 4:
      Action: Notify Slack channel
      Channel: #platform-incidents
```

### Severity-Based Escalation

Different severities warrant different responses:

```yaml
# Critical: Immediate multi-channel notification
Policy: Critical Alerts
Steps:
  - Notify via: Phone call, SMS, Push notification
    Wait: 3 minutes
  - Escalate to: Secondary
    Wait: 5 minutes
  - Escalate to: Management

# Warning: Standard notification with longer timeouts
Policy: Warning Alerts
Steps:
  - Notify via: Push notification, Slack
    Wait: 15 minutes
  - Escalate to: Secondary
```

## Third-Party Integrations

Grafana also integrates with external on-call systems.

### PagerDuty Integration

Configure Grafana to send alerts to PagerDuty:

```yaml
# Contact point configuration
Name: PagerDuty Production
Type: PagerDuty

Settings:
  Integration Key: abc123...
  Severity: auto  # Maps from Grafana alert labels
  Class: infrastructure
  Component: "{{ .Labels.service }}"
  Group: "{{ .Labels.namespace }}"
```

Alert severity mapping:

```yaml
# Grafana to PagerDuty severity mapping
critical -> critical
warning -> warning
info -> info
```

### Opsgenie Integration

```yaml
# Contact point configuration
Name: Opsgenie
Type: Opsgenie

Settings:
  API Key: abc123...
  API URL: https://api.opsgenie.com
  Priority: P1  # or use template
  Tags: ["grafana", "{{ .Labels.team }}"]
  Teams: ["{{ .Labels.team }}-oncall"]
```

### Webhook to Custom Systems

For custom on-call systems, use the webhook contact point:

```yaml
# Contact point configuration
Name: Custom OnCall System
Type: Webhook

Settings:
  URL: https://oncall.internal/api/alerts
  HTTP Method: POST

  # Custom headers
  HTTP Headers:
    Authorization: Bearer $ONCALL_TOKEN
    Content-Type: application/json

  # Message template
  Message: |
    {
      "alert_name": "{{ .CommonLabels.alertname }}",
      "severity": "{{ .CommonLabels.severity }}",
      "service": "{{ .CommonLabels.service }}",
      "summary": "{{ .CommonAnnotations.summary }}",
      "dashboard_url": "{{ .ExternalURL }}",
      "values": {{ .Values | toJson }}
    }
```

## Alert Templates for On-Call

Well-formatted alert messages help on-call engineers respond faster.

### Notification Template

```go
{{ define "oncall.message" }}
[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}

Service: {{ .CommonLabels.service }}
Severity: {{ .CommonLabels.severity }}
Environment: {{ .CommonLabels.environment }}

Summary: {{ .CommonAnnotations.summary }}
{{ if .CommonAnnotations.description }}
Description: {{ .CommonAnnotations.description }}
{{ end }}

{{ if .CommonAnnotations.runbook_url }}
Runbook: {{ .CommonAnnotations.runbook_url }}
{{ end }}

Dashboard: {{ .ExternalURL }}

Labels:
{{ range .CommonLabels.SortedPairs }}  - {{ .Name }}: {{ .Value }}
{{ end }}
{{ end }}
```

### Include Actionable Information

Good alert messages include:

```yaml
annotations:
  summary: "High error rate on {{ $labels.service }}"
  description: |
    Error rate is {{ $value | humanizePercentage }} over the last 5 minutes.
    This exceeds the threshold of 5%.
  runbook_url: "https://wiki.example.com/runbooks/high-error-rate"
  dashboard_url: "https://grafana.example.com/d/service-overview?var-service={{ $labels.service }}"
```

## Managing Incidents

Once an alert fires, manage the incident through OnCall.

### Acknowledging Alerts

Engineers can acknowledge alerts via:
- OnCall web interface
- Slack commands (if integrated)
- Phone keypress (for phone notifications)
- Mobile app

### Alert Grouping

Configure grouping to reduce noise:

```yaml
Integration Settings:
  Grouping Type: Time-based
  Grouping Window: 5 minutes

  # Or use label-based grouping
  Grouping Type: Label
  Grouping Key: "{{ .Labels.alertname }}-{{ .Labels.service }}"
```

### Silence and Maintenance

Create silences for planned maintenance:

```bash
# Via API
curl -X POST \
     -H "Authorization: Bearer $GRAFANA_TOKEN" \
     https://grafana.example.com/api/alertmanager/grafana/api/v2/silences \
     -d '{
       "matchers": [
         {"name": "service", "value": "api-gateway", "isRegex": false}
       ],
       "startsAt": "2026-01-26T00:00:00Z",
       "endsAt": "2026-01-26T06:00:00Z",
       "createdBy": "alice",
       "comment": "Scheduled maintenance window"
     }'
```

## Measuring On-Call Health

Track on-call burden to prevent burnout.

### Key Metrics

```promql
# Alerts per on-call shift
sum(increase(alertmanager_alerts_received_total[7d])) / 7

# Average time to acknowledge
avg(oncall_alert_acknowledge_time_seconds)

# Escalation rate (alerts reaching secondary)
sum(increase(oncall_escalation_total[7d]))
/
sum(increase(oncall_alert_total[7d]))
```

### On-Call Report Dashboard

Create a dashboard tracking:
- Alerts per person
- Night vs. day pages
- Mean time to acknowledge
- Escalation frequency
- Alert noise (quickly resolved alerts)

## Best Practices

### Define Clear Ownership

Every service needs an owner:

```yaml
# Service metadata in alerts
labels:
  team: platform
  service: api-gateway
  tier: critical
```

### Set Appropriate Thresholds

Not every anomaly deserves a page:
- Critical: Customer impact, immediate action needed
- Warning: Degradation, investigate during business hours
- Info: Tracked but not paged

### Regular Schedule Reviews

- Rotate fairly across the team
- Account for holidays and time zones
- Provide backup coverage always

### Post-Incident Analysis

After every incident:
- Review time to detection
- Assess alert quality
- Update runbooks
- Consider automation

## Conclusion

On-call integration transforms Grafana from a visualization tool into a complete incident management system. Whether using Grafana OnCall or integrating with PagerDuty or Opsgenie, the key is clear routing, appropriate escalation, and actionable alert messages. Measure on-call health to maintain team sustainability, and continuously improve based on incident learnings.
