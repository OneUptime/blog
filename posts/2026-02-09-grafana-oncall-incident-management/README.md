# How to use Grafana Oncall for incident management integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Oncall, Incident Management

Description: Learn how to set up and use Grafana Oncall for managing on-call schedules, escalations, and incident response workflows.

---

Getting woken up at 3 AM is part of being on-call, but chaotic incident management makes it worse. Grafana Oncall brings structure to incident response with intelligent routing, escalation policies, and integration with your existing Grafana alerting infrastructure. It turns alert noise into organized action.

## Understanding Grafana Oncall

Grafana Oncall is an incident response platform that integrates directly with Grafana's unified alerting system. It handles on-call schedules, alert routing, escalations, and acknowledgments while maintaining a complete incident timeline.

Unlike standalone paging tools, Oncall lives within your Grafana stack, giving responders immediate access to dashboards, logs, and traces without context switching between tools.

## Installing Grafana Oncall

Oncall can run as a standalone service or as a Grafana Cloud feature. For self-hosted deployments, use Docker Compose.

```yaml
# docker-compose.yml
version: '3.8'

services:
  oncall-engine:
    image: grafana/oncall:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_TYPE=postgresql
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=oncall
      - DATABASE_USER=oncall
      - DATABASE_PASSWORD=oncall_password
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - SECRET_KEY=your-secret-key
      - BASE_URL=http://localhost:8080
      - GRAFANA_API_URL=http://grafana:3000
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=oncall
      - POSTGRES_USER=oncall
      - POSTGRES_PASSWORD=oncall_password
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

Start the services with `docker-compose up -d`. Oncall will be available at http://localhost:8080.

## Connecting Oncall to Grafana

Install the Oncall plugin in Grafana to enable bidirectional integration.

```bash
# Install the plugin
grafana-cli plugins install grafana-oncall-app

# Restart Grafana
docker restart grafana
```

Then configure the connection in Grafana:

```yaml
# grafana.ini additions
[plugin.grafana-oncall-app]
enabled = true
oncall_api_url = http://oncall-engine:8080
```

Navigate to Configuration > Plugins in Grafana, find Oncall, and complete the setup wizard to link your Grafana instance to the Oncall engine.

## Creating Your First Integration

Integrations define how alerts flow into Oncall. Create an integration for Grafana Alerting.

```bash
# Create integration via API
curl -X POST http://localhost:8080/api/v1/integrations/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "grafana_alerting",
    "name": "Production Alerts",
    "team_id": "T001"
  }'
```

This returns a webhook URL that you'll use in Grafana's contact point configuration.

## Configuring Grafana Contact Points for Oncall

In Grafana, create a contact point that sends alerts to Oncall.

```yaml
# Contact point configuration in Grafana
Name: Oncall Production
Type: Webhook

URL: http://oncall-engine:8080/integrations/v1/grafana_alerting/INTEGRATION_TOKEN/

# Optional: add custom headers
HTTP Headers:
  X-Team: production
  X-Priority: high
```

Now alerts from Grafana will flow into Oncall for routing and escalation.

## Setting Up On-Call Schedules

Schedules determine who receives alerts at any given time. Oncall supports rotation schedules, overrides, and handoff notifications.

```bash
# Create an on-call schedule via API
curl -X POST http://localhost:8080/api/v1/schedules/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Primary On-Call",
    "team_id": "T001",
    "type": "calendar",
    "ical_url_primary": null,
    "time_zone": "America/New_York",
    "shifts": [
      {
        "name": "Weekday Daytime",
        "type": "rolling_users",
        "users": ["U001", "U002", "U003"],
        "rotation_start": "2026-02-10T09:00:00Z",
        "duration": 86400,
        "frequency": "weekly",
        "week_start": "monday",
        "by_day": ["MO", "TU", "WE", "TH", "FR"],
        "start_time": "09:00:00",
        "end_time": "17:00:00"
      },
      {
        "name": "24/7 Coverage",
        "type": "rolling_users",
        "users": ["U001", "U002", "U003"],
        "rotation_start": "2026-02-10T00:00:00Z",
        "duration": 604800,
        "frequency": "weekly"
      }
    ]
  }'
```

This creates a schedule with weekday daytime coverage and weekly rotation for 24/7 periods.

## Building Escalation Chains

Escalation chains define what happens when alerts aren't acknowledged. Start with immediate notification, then escalate through multiple levels.

```json
{
  "name": "Production Escalation",
  "team_id": "T001",
  "steps": [
    {
      "type": "notify_persons",
      "persons": ["current_oncall"],
      "important": false
    },
    {
      "type": "wait",
      "duration": 300
    },
    {
      "type": "notify_persons",
      "persons": ["current_oncall"],
      "important": true
    },
    {
      "type": "wait",
      "duration": 300
    },
    {
      "type": "notify_schedule",
      "schedule_id": "S002",
      "important": true
    },
    {
      "type": "wait",
      "duration": 600
    },
    {
      "type": "notify_team_members",
      "team_id": "T001"
    }
  ]
}
```

This escalation policy tries the on-call person, waits 5 minutes, tries again with important flag (different notification method), then escalates to a backup schedule, and finally notifies the entire team if still unacknowledged.

## Creating Routing Rules

Routing rules direct alerts to different escalation chains based on alert labels and severity.

```bash
# Create route via API
curl -X POST http://localhost:8080/api/v1/routes/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "I001",
    "routing_regex": ".*severity=critical.*",
    "escalation_chain_id": "E001"
  }'

# Create another route for warnings
curl -X POST http://localhost:8080/api/v1/routes/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "I001",
    "routing_regex": ".*severity=warning.*",
    "escalation_chain_id": "E002"
  }'
```

Critical alerts go through faster escalation while warnings use a more relaxed policy.

## Configuring Notification Methods

Each user can configure multiple notification channels with different priorities.

```json
{
  "user_id": "U001",
  "notification_channels": [
    {
      "type": "slack",
      "slack_user_id": "U123456",
      "important": false
    },
    {
      "type": "sms",
      "phone_number": "+1234567890",
      "important": true
    },
    {
      "type": "phone_call",
      "phone_number": "+1234567890",
      "important": true
    }
  ],
  "notification_timing": {
    "default_notification_delay": 0,
    "important_notification_delay": 0
  }
}
```

Regular notifications go to Slack, while important notifications trigger SMS and phone calls immediately.

## Acknowledging and Resolving Incidents

When an alert fires, responders can acknowledge it through multiple channels.

```bash
# Acknowledge via API
curl -X POST http://localhost:8080/api/v1/incidents/INC001/acknowledge/ \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Resolve incident
curl -X POST http://localhost:8080/api/v1/incidents/INC001/resolve/ \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Add resolution note
curl -X POST http://localhost:8080/api/v1/incidents/INC001/notes/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Resolved by restarting pod api-7d8f9b"
  }'
```

Acknowledgments stop escalation, while resolution closes the incident and creates a record for post-mortems.

## Using Oncall with Grafana Dashboards

Oncall embeds incident context directly in Grafana. Responders see which dashboards to check without leaving their workflow.

```yaml
# Configure incident templates to include dashboard links
incident_template:
  title: "{{ payload.groupLabels.alertname }}"
  message: |
    Alert: {{ payload.groupLabels.alertname }}
    Severity: {{ payload.commonLabels.severity }}
    Instance: {{ payload.commonLabels.instance }}

    Dashboard: https://grafana.example.com/d/dashboard-uid

    Runbook: https://runbooks.example.com/{{ payload.groupLabels.alertname }}
```

This creates a direct link from the incident notification to relevant dashboards and documentation.

## Implementing Alert Grouping

Group related alerts to prevent notification storms during cascading failures.

```json
{
  "integration_id": "I001",
  "grouping_config": {
    "enabled": true,
    "fields": ["namespace", "alertname"],
    "timeout": 300
  }
}
```

Alerts with the same namespace and alert name get grouped into a single incident, with all related alerts visible in the incident timeline.

## Creating Custom Webhooks for Actions

Automate common remediation actions using outgoing webhooks.

```json
{
  "name": "Restart Pod",
  "webhook_url": "https://automation.example.com/restart-pod",
  "trigger_type": "manual",
  "data": "{{ payload }}"
}
```

Responders can trigger these webhooks from the Oncall UI, running automated remediation without leaving the incident response interface.

## Analyzing Incident Metrics

Oncall tracks key metrics about your incident response process.

```bash
# Get incident statistics
curl -X GET "http://localhost:8080/api/v1/incidents/stats/?from=2026-02-01&to=2026-02-09" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

This returns data on mean time to acknowledge (MTTA), mean time to resolve (MTTR), incidents per day, and escalation frequency.

## Setting Up Maintenance Windows

Prevent alert noise during planned maintenance by creating maintenance windows.

```bash
# Create maintenance window
curl -X POST http://localhost:8080/api/v1/maintenance/ \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_ids": ["I001"],
    "start_time": "2026-02-09T14:00:00Z",
    "end_time": "2026-02-09T16:00:00Z"
  }'
```

Alerts during this window are received but don't trigger notifications or escalations.

## Best Practices for Oncall Management

Keep escalation chains short. If alerts reach the fourth escalation level regularly, your monitoring needs tuning, not more escalation steps.

Use different escalation policies for different severity levels. Critical alerts should escalate quickly, while warnings can wait longer between steps.

Configure notification methods appropriate to importance. Slack for low-priority, SMS for medium, phone calls for critical.

Review incidents weekly to identify patterns. Multiple incidents for the same issue suggest the underlying problem needs fixing.

Rotate on-call responsibilities fairly and document handoff procedures so transitions are smooth.

Test your escalation chains monthly by triggering test alerts to verify all notification channels work correctly.

Grafana Oncall transforms alert chaos into structured incident response. By integrating directly with Grafana's monitoring stack, it gives responders the context and tools they need to resolve issues quickly and learn from each incident.
