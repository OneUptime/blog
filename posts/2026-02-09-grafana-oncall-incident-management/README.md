# How to use Grafana Oncall for incident management integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, OnCall, Incident Management

Description: Learn how to set up and use Grafana Oncall for managing on-call schedules, escalations, and incident response workflows.

---

Getting woken up at 3 AM is part of being on-call, but chaotic incident management makes it worse. Grafana Oncall brings structure to incident response with intelligent routing, escalation policies, and integration with your existing Grafana alerting infrastructure. It turns alert noise into organized action.

## Understanding Grafana Oncall

Grafana Oncall is an incident response platform that integrates with Grafana's unified alerting system. It handles on-call schedules, alert routing, escalations, and acknowledgments while maintaining a complete alert group timeline.

Unlike standalone paging tools, Oncall is available from Grafana through the OnCall app plugin, giving responders access to dashboards, logs, and traces with less context switching between tools.

## Installing Grafana Oncall

Oncall can run as a self-hosted OSS service or as part of Grafana Cloud IRM. As of March 24, 2026, the Grafana OnCall OSS repository is archived and read-only, so use self-hosted OSS only for existing deployments or migration testing. For a local OSS playground, use the official Docker Compose file from the Grafana OnCall repository.

```bash
curl -fsSL https://raw.githubusercontent.com/grafana/oncall/dev/docker-compose.yml -o docker-compose.yml

cat > .env <<'EOF'
DOMAIN=http://localhost:8080
COMPOSE_PROFILES=with_grafana
SECRET_KEY=my_random_secret_must_be_more_than_32_characters_long
EOF

docker compose up -d
```

Oncall will be available at http://localhost:8080.

## Connecting Oncall to Grafana

Install the Oncall plugin in Grafana to enable bidirectional integration.

```bash
# Install the plugin
grafana-cli plugins install grafana-oncall-app

# Restart Grafana
docker restart grafana
```

Navigate to Administration > Plugins and data > Plugins in Grafana, find Oncall, and complete the setup wizard to link your Grafana instance to the Oncall engine.

## Creating Your First Integration

Integrations define how alerts flow into Oncall. Create an integration for Grafana Alerting.

```bash
# Create integration via API
curl -X POST http://localhost:8080/api/v1/integrations/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "grafana"
  }'
```

This returns a webhook URL that you'll use in Grafana's contact point configuration.

## Configuring Grafana Contact Points for Oncall

In Grafana, create a contact point that sends alerts to Oncall.

```yaml
# Contact point configuration in Grafana
Name: Oncall Production
Type: Webhook

URL: http://oncall-engine:8080/integrations/v1/grafana/INTEGRATION_TOKEN/

# Optional: add custom headers
HTTP Headers:
  X-Team: production
  X-Priority: high
```

Now alerts from Grafana will flow into Oncall for routing and escalation.

## Setting Up On-Call Schedules

Schedules determine who receives alerts at any given time. Oncall supports rotation schedules, overrides, and handoff notifications.

```bash
# Create an API-managed schedule
curl -X POST http://localhost:8080/api/v1/schedules/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Primary On-Call",
    "team_id": "T001",
    "type": "calendar",
    "time_zone": "America/New_York"
  }'

# Create a weekly rolling shift for that schedule
curl -X POST http://localhost:8080/api/v1/on_call_shifts/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "24/7 Coverage",
    "type": "rolling_users",
    "team_id": "T001",
    "start": "2026-02-10T00:00:00",
    "duration": 604800,
    "frequency": "weekly",
    "week_start": "MO",
    "rolling_users": [["U001"], ["U002"], ["U003"]]
  }'
```

This creates an API-managed schedule and a weekly 24/7 rolling shift.

## Building Escalation Chains

Escalation chains define what happens when alerts aren't acknowledged. Start with immediate notification, then escalate through multiple levels.

```bash
# Create the escalation chain
curl -X POST http://localhost:8080/api/v1/escalation_chains/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Escalation",
    "team_id": "T001"
  }'

# Add ordered escalation policies to the chain
curl -X POST http://localhost:8080/api/v1/escalation_policies/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escalation_chain_id": "E001",
    "type": "notify_on_call_from_schedule",
    "notify_on_call_from_schedule": "S001",
    "position": 0
  }'

curl -X POST http://localhost:8080/api/v1/escalation_policies/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escalation_chain_id": "E001",
    "type": "wait",
    "duration": 300,
    "position": 1
  }'

curl -X POST http://localhost:8080/api/v1/escalation_policies/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escalation_chain_id": "E001",
    "type": "notify_team_members",
    "team_to_notify": "T001",
    "important": true,
    "position": 2
  }'
```

This escalation chain notifies the current on-call user from the schedule, waits 5 minutes, and then notifies the entire team with the important flag if the alert group is still unacknowledged.

## Creating Routing Rules

Routing rules direct alerts to different escalation chains based on alert labels and severity.

```bash
# Create route via API
curl -X POST http://localhost:8080/api/v1/routes/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "I001",
    "routing_regex": ".*severity=critical.*",
    "escalation_chain_id": "E001",
    "position": 0
  }'

# Create another route for warnings
curl -X POST http://localhost:8080/api/v1/routes/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "I001",
    "routing_regex": ".*severity=warning.*",
    "escalation_chain_id": "E002",
    "position": 1
  }'
```

Critical alerts go through faster escalation while warnings use a more relaxed policy.

## Configuring Notification Methods

Each user can configure multiple notification channels with different priorities.

```bash
curl -X POST http://localhost:8080/api/v1/personal_notification_rules/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U001",
    "type": "notify_by_slack",
    "position": 0
  }'

curl -X POST http://localhost:8080/api/v1/personal_notification_rules/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U001",
    "type": "notify_by_sms",
    "important": true,
    "position": 0
  }'

curl -X POST http://localhost:8080/api/v1/personal_notification_rules/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "U001",
    "type": "notify_by_phone_call",
    "important": true,
    "position": 1
  }'
```

Regular notifications go to Slack, while important notifications trigger SMS and phone calls according to the user's important notification policy.

## Acknowledging and Resolving Incidents

When an alert fires, responders can acknowledge it through multiple channels.

```bash
# Acknowledge via API
curl -X POST http://localhost:8080/api/v1/alert_groups/I001/acknowledge \
  -H "Authorization: YOUR_API_TOKEN"

# Resolve alert group
curl -X POST http://localhost:8080/api/v1/alert_groups/I001/resolve \
  -H "Authorization: YOUR_API_TOKEN"

# Add resolution note
curl -X POST http://localhost:8080/api/v1/resolution_notes/ \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_group_id": "I001",
    "text": "Resolved by restarting pod api-7d8f9b"
  }'
```

Acknowledgments stop escalation, while resolution closes the alert group and resolution notes create a record for post-mortems.

## Using Oncall with Grafana Dashboards

Oncall embeds incident context directly in Grafana. Responders see which dashboards to check without leaving their workflow.

```json
{
  "templates": {
    "web": {
      "title": "{{ payload.title }}",
      "message": "Alert: {{ payload.title }}\nSeverity: {{ payload.get('severity', 'unknown') }}\nDashboard: {{ payload.ruleUrl }}\nRunbook: https://runbooks.example.com/{{ payload.title }}"
    },
    "source_link": "{{ payload.ruleUrl }}"
  }
}
```

This creates a direct link from the incident notification to relevant dashboards and documentation.

## Implementing Alert Grouping

Group related alerts to prevent notification storms during cascading failures.

```json
{
  "templates": {
    "grouping_key": "{{ payload.groupKey }}"
  }
}
```

Grafana Alerting and Alertmanager should usually handle grouping before sending alerts to Oncall. Oncall then uses the integration's grouping template to decide which alerts belong in the same alert group.

## Creating Custom Webhooks for Actions

Automate common remediation actions using outgoing webhooks.

```json
{
  "name": "Restart Pod",
  "url": "https://automation.example.com/restart-pod",
  "http_method": "POST",
  "trigger_type": "resolve",
  "data": "{\"labels\": {{ alert_payload.commonLabels | tojson() }}}"
}
```

Responders can use outgoing webhooks to run automated workflows when supported alert group events occur.

## Analyzing Incident Metrics

Oncall exposes alert group timestamps and state changes that you can use to analyze your incident response process.

```bash
# List alert groups for a date range
curl -X GET "http://localhost:8080/api/v1/alert_groups/?started_at=2026-02-01T00:00:00_2026-02-09T23:59:59" \
  -H "Authorization: YOUR_API_TOKEN"
```

This returns alert group data you can use to calculate response metrics such as mean time to acknowledge (MTTA), mean time to resolve (MTTR), incident volume, and escalation frequency.

## Setting Up Maintenance Windows

Prevent alert noise during planned maintenance by starting Maintenance Mode on the affected integration from the Integration page menu. Choose Debug mode to process alerts without notifying users, or Maintenance mode to consolidate alerts during infrastructure work, set the duration, and stop the mode from the same menu when maintenance ends.

## Best Practices for Oncall Management

Keep escalation chains short. If alerts reach the fourth escalation level regularly, your monitoring needs tuning, not more escalation steps.

Use different escalation policies for different severity levels. Critical alerts should escalate quickly, while warnings can wait longer between steps.

Configure notification methods appropriate to importance. Slack works well for low-priority alerts, while SMS and phone calls are common for critical alerts when you have configured a supported phone or SMS provider.

Review incidents weekly to identify patterns. Multiple incidents for the same issue suggest the underlying problem needs fixing.

Rotate on-call responsibilities fairly and document handoff procedures so transitions are smooth.

Test your escalation chains monthly by triggering test alerts to verify all notification channels work correctly.

Grafana Oncall transforms alert chaos into structured incident response. By integrating directly with Grafana's monitoring stack, it gives responders the context and tools they need to resolve issues quickly and learn from each incident.
