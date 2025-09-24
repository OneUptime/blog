# Integrating Grafana Alerts with OneUptime: Automated Incident Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Alerts, Monitoring, Incoming Request, Heartbeat, Status Page, On-call, Incident Management, DevOps, Webhooks, Automation

Description: A comprehensive guide to integrating Grafana alerts with OneUptime's incoming request monitors. Learn how to automatically create incidents, update status pages, and trigger on-call rotations when Grafana detects issues.

---

Grafana alerts are powerful for detecting metric anomalies, but what happens when alerts fire? OneUptime's incoming request monitors let Grafana automatically create incidents, update status pages, and trigger on-call rotations.

This guide shows you how to bridge Grafana's alerting with OneUptime's incident management for seamless observability workflows.

---

## TL;DR

- Grafana can send alert notifications to OneUptime's incoming request endpoints
- Automatically create incidents when Grafana alerts fire
- Update status pages in real-time based on alert severity
- Trigger on-call rotations for critical alerts
- Use webhook integrations for bi-directional alert management

---

## Why Integrate Grafana with OneUptime?

Grafana excels at visualization and alerting, but incident management requires more:

- **Incident tracking**: Grafana alerts are ephemeral; OneUptime provides persistent incident records
- **Status page updates**: Automatically communicate issues to stakeholders
- **On-call management**: Route alerts to the right people at the right time
- **Escalation policies**: Handle alerts that don't get acknowledged
- **Post-mortem workflows**: Track resolution and learn from incidents

Integration creates a complete observability pipeline from detection to resolution.

---

## How Grafana Alert Integration Works

The integration uses **incoming request monitors** with webhooks:

1. **Grafana fires an alert** based on metric thresholds or queries
2. **Webhook sends alert data** to OneUptime's incoming request endpoint
3. **OneUptime creates/updates incidents** based on alert severity
4. **Status pages update automatically** to reflect current system health
5. **On-call rotations trigger** for critical alerts requiring immediate attention

```mermaid
flowchart LR
  subgraph Grafana
    Q[Queries]
    R[Rules]
    A[Alert]
  end
  
  subgraph OneUptime
    IR[Incoming Request]
    I[Incident Creation]
    SP[Status Page Update]
    OC[On-call Trigger]
  end
  
  Q --> R --> A
  A -->|Webhook| IR
  IR --> I
  I --> SP
  I --> OC
  
  SP -->|Public Status| Customers
  OC -->|Notifications| Engineers
```

---

## Setting Up Grafana Alert Integration

### Step 1: Create an Incoming Request Monitor

1. Navigate to **Monitors** in your OneUptime dashboard
2. Click **Create Monitor**
3. Select **Incoming Request** as the monitor type
4. Configure monitor settings:
   ```
   Monitor Name: Grafana Alert Integration
   Description: Receives alert notifications from Grafana instances
   ```

### Step 2: Get Your Webhook URL

After creating the monitor, OneUptime provides a unique URL:

```
https://oneuptime.com.com/heartbeat/abc123
```

This URL will receive webhook payloads from Grafana.

### Step 3: Configure Grafana Contact Point

In Grafana, create a new contact point:

1. Go to **Alerting > Contact points**
2. Click **Add contact point**
3. Select **Webhook** as the integration type
4. Configure the webhook:
   ```
   Name: OneUptime Integration
   URL: https://oneuptime.com.com/heartbeat/abc123
   HTTP Method: POST
   ```

---

## Grafana Alert Rule Configuration

### Basic Alert Rule Setup

Create alert rules that send meaningful data to OneUptime:

```yaml
# Example Grafana alert rule
alert: High CPU Usage
expr: cpu_usage_percent > 85
for: 5m
labels:
  severity: critical
  service: web-server
  team: infrastructure
annotations:
  summary: "High CPU usage detected"
  description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"
  runbook_url: "https://wiki.company.com/cpu-troubleshooting"
  dashboard_url: "https://grafana.company.com/d/cpu-dashboard"
```

### Advanced Alert Configuration

Include contextual information for better incident management:

```yaml
alert: Database Connection Pool Exhausted
expr: db_connections_active / db_connections_max > 0.9
for: 2m
labels:
  severity: warning
  service: database
  component: connection-pool
  environment: production
annotations:
  summary: "Database connection pool nearly exhausted"
  description: "Active connections: {{ $value }} of max {{ $labels.max_connections }}"
  impact: "May cause application slowdown or outages"
  affected_services: "web-app, api-gateway, background-jobs"
  mitigation_steps: "1. Check application connection leaks 2. Consider scaling database"
  owner: "database-team@company.com"
```

---

## Processing Grafana Webhooks in OneUptime

### Webhook Payload Structure

Grafana sends structured webhook payloads:

```json
{
  "receiver": "oneuptime-integration",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "High CPU Usage",
        "severity": "critical",
        "service": "web-server",
        "instance": "web-01"
      },
      "annotations": {
        "summary": "High CPU usage detected",
        "description": "CPU usage is 92.5% on web-01",
        "runbook_url": "https://wiki.company.com/cpu-troubleshooting"
      },
      "startsAt": "2025-09-26T10:30:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://grafana.company.com/alerting/grafana/...",
      "fingerprint": "a1b2c3d4e5f6..."
    }
  ],
  "groupLabels": {
    "service": "web-server"
  },
  "commonLabels": {
    "severity": "critical",
    "service": "web-server"
  },
  "commonAnnotations": {
    "summary": "High CPU usage detected"
  },
  "externalURL": "https://grafana.company.com/",
  "version": "1",
  "groupKey": "{service=\"web-server\"}",
  "truncatedAlerts": 0
}
```

### Incident Creation Logic

Configure OneUptime to create incidents based on webhook data:

**Severity Mapping:**
- `critical` → Create incident, trigger on-call, update status page
- `warning` → Create incident, notify team, minor status page update
- `info` → Log only, no incident creation

**Incident Title Generation:**
```
[{{requestBody.alerts[0].labels.severity}}] {{requestBody.alerts[0].annotations.summary}}
```

**Incident Description Template:**
```markdown
**Alert Details:**
- **Service:** {{requestBody.alerts[0].labels.service}}
- **Instance:** {{requestBody.alerts[0].labels.instance}}
- **Started:** {{requestBody.alerts[0].startsAt | formatDate}}
- **Description:** {{requestBody.alerts[0].annotations.description}}

**Additional Context:**
{{requestBody.alerts[0].annotations.impact}}

**Runbook:** {{requestBody.alerts[0].annotations.runbook_url}}
**Dashboard:** {{requestBody.alerts[0].generatorURL}}

**Affected Services:** {{requestBody.alerts[0].annotations.affected_services}}
**Owner:** {{requestBody.alerts[0].annotations.owner}}
```

---

## Status Page Integration

### Automatic Status Updates

Configure status pages to update based on alert severity:

**Critical Alerts:**
- Set component status to "Major Outage"
- Display incident details on status page
- Send notifications to subscribers

**Warning Alerts:**
- Set component status to "Partial Outage" or "Degraded Performance"
- Show maintenance-like messaging

**Resolved Alerts:**
- Automatically resolve incidents when Grafana sends "resolved" status
- Update status page to "Operational"
- Send "all clear" notifications

### Status Page Configuration

1. Create status page components matching your services
2. Map Grafana alert labels to status page components
3. Configure automated status updates based on alert lifecycle

---

## On-Call Management Integration

### Triggering On-Call Rotations

Set up escalation policies for different alert types:

**Critical Production Alerts:**
```
Immediate: Page primary on-call engineer
5 minutes: Escalate to secondary on-call
15 minutes: Notify entire team
30 minutes: Escalate to management
```

**Non-Critical Alerts:**
```
Immediate: Slack notification to on-call channel
30 minutes: Email notification
4 hours: Escalate if unacknowledged
```

### On-Call Schedule Integration

Connect with popular on-call tools:

- **OneUptime**: You can use OneUptime for on-call without using any other tools, but you can integrate with other tools as well.
- **PagerDuty**: Forward alerts to PD services
- **Opsgenie**: Create incidents in Opsgenie
- **VictorOps**: Route alerts through VictorOps
- **Native OneUptime**: Use built-in on-call scheduling

---

### Enterprise Integration Patterns

**Centralized Alert Management:**
- Route alerts from multiple Grafana instances
- Aggregate alerts across teams/services
- Implement cross-team incident coordination

**Compliance and Auditing:**
- Log all alert deliveries
- Track incident response times
- Generate compliance reports
- Maintain audit trails

---

## Conclusion

Grafana alert integration with OneUptime creates a seamless observability workflow from detection to resolution. By connecting Grafana's powerful alerting with OneUptime's incident management, you:

- **Automate incident creation** from metric anomalies
- **Keep stakeholders informed** with automatic status page updates
- **Ensure rapid response** through on-call integrations
- **Maintain compliance** with comprehensive incident tracking
- **Improve MTTR** with structured incident workflows

Start with your most critical alerts, establish reliable webhook delivery, and gradually expand integration across your Grafana infrastructure.

Your incident response will be faster, your communication more effective, and your system reliability more predictable.

---

Ready to integrate Grafana alerts with OneUptime? The combination creates a powerful observability platform that bridges monitoring and incident management.

Start integrating your Grafana alerts today and transform your incident response capabilities.

---

*For more information on incoming request monitors, see our guides on [Monitoring IoT Devices](https://oneuptime.com/blog/post/2025-09-24-monitoring-iot-devices-with-oneuptime/view) and [Monitoring Backup Jobs](https://oneuptime.com/blog/post/2025-09-25-monitoring-backup-jobs-with-oneuptime/view) with OneUptime.*