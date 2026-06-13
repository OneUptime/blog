# How to Implement On-Call Integration with Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OnCall, Incident Management, Alerting, PagerDuty, OpsGenie, SRE

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

Grafana OnCall OSS is an incident management solution that integrates with Grafana Alerting. It handles:

- Alert grouping and deduplication
- On-call schedules and rotations
- Multi-channel notifications (Slack, phone, SMS, email)
- Escalation policies

### Enabling Grafana OnCall

> **Note:** As of March 24, 2026, Grafana OnCall OSS has been archived, and the `grafana/oncall` repository is read-only. For new deployments, Grafana recommends [Grafana Cloud IRM](https://grafana.com/blog/oncall-management-incident-response-grafana-cloud-irm/). The self-hosted OSS path described below is useful for existing or legacy installations, but it is no longer actively developed.

In Grafana Cloud, use Grafana Cloud IRM from the Alerts & IRM menu. For self-hosted legacy Grafana OnCall OSS, you can deploy Grafana OnCall separately:

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
3. For the same Grafana instance, use "Quick connect" in the Grafana Alerting tile; for another Grafana instance, select the Alertmanager tile
4. Name it (e.g., "Production Alerts")

For an external Grafana instance, you will receive a webhook URL to use in Grafana Alerting contact points.

### Step 2: Configure Contact Point

In Grafana Alerting, create a contact point that sends to OnCall:

```yaml
# Contact point configuration
Name: Production OnCall
Type: Webhook
URL: https://oncall.example.com/integrations/v1/grafana/abc123/
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
      Channel: "#platform-incidents"
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
  Severity: "{{ .CommonLabels.severity }}"  # Must render as critical, error, warning, or info
  Class: infrastructure
  Component: "{{ .CommonLabels.service }}"
  Group: "{{ .CommonLabels.namespace }}"
```

Alert severity mapping:

```yaml
# Grafana to PagerDuty severity mapping
severity_mapping:
  critical: critical
  error: error
  warning: warning
  info: info
```

### Opsgenie Integration

```yaml
# Contact point configuration
Name: Opsgenie
Type: Opsgenie

Settings:
  API Key: abc123...
  Alert API URL: https://api.opsgenie.com/v2/alerts
  Override priority: true  # Set the og_priority label to P1, P2, P3, P4, or P5
  Send notification tags as: Tags
  Responders:
    - Type: team
      Name: platform-oncall
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

  # Authorization header
  Authentication Header Scheme: Bearer
  Authentication Header Credentials: $ONCALL_TOKEN

  # Custom payload template
  Custom Payload: |
    {{ coll.Dict
      "alert_name" .CommonLabels.alertname
      "severity" .CommonLabels.severity
      "service" .CommonLabels.service
      "summary" .CommonAnnotations.summary
      "external_url" .ExternalURL
      "alerts" .Alerts
      | data.ToJSON
    }}
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
    Error rate is {{ humanizePercentage $values.A.Value }} over the last 5 minutes.
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
# For the Grafana Alerting integration, configure grouping in Grafana Alerting
Notification Policy:
  Group by: [alertname, service]
  Group wait: 30 seconds
  Group interval: 5 minutes

# For generic webhook integrations, use an OnCall Grouping ID Template
Integration Templates:
  Grouping ID Template: "{{ payload.labels.alertname }}-{{ payload.labels.service }}"
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

For Grafana OnCall OSS metrics, use the `oncall_` prefix. In Grafana Cloud, the equivalent metrics use the `grafanacloud_oncall_instance_` prefix.

```promql
# Alert group notifications per user over 7 days
sum by (username) (increase(oncall_user_was_notified_of_alert_groups_total[7d]))

# Average response time over 7 days
sum(increase(oncall_alert_groups_response_time_seconds_sum[7d]))
/
sum(increase(oncall_alert_groups_response_time_seconds_count[7d]))

# Current alert groups by state
sum by (state) (oncall_alert_groups_total)
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
