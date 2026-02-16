# How to Use Azure Managed Grafana Alerting Rules to Notify on Infrastructure Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Managed Grafana, Alerting, Infrastructure Monitoring, Grafana, Azure Monitor, Observability, Notifications

Description: Learn how to configure alerting rules in Azure Managed Grafana to detect infrastructure issues and notify your team through multiple channels.

---

Azure Managed Grafana gives you the full Grafana experience without managing the infrastructure. You get dashboards, data source integrations, and - importantly - Grafana's alerting system. While Azure Monitor has its own alerting, Grafana alerting is valuable when you want alerts that correlate data from multiple sources (Azure Monitor metrics, Prometheus, custom data sources) or when your team already uses Grafana as their primary observability tool.

Grafana's alerting engine evaluates rules on a schedule, checks conditions against your data sources, and sends notifications through contact points. This guide covers setting up the full alerting pipeline in Azure Managed Grafana.

## Setting Up Azure Managed Grafana

If you do not already have an instance:

```bash
# Create an Azure Managed Grafana instance
az grafana create \
  --name myGrafana \
  --resource-group myRG \
  --location eastus \
  --sku Standard
```

Grant access to Azure Monitor data:

```bash
# Assign Monitoring Reader role so Grafana can read Azure Monitor data
GRAFANA_IDENTITY=$(az grafana show --name myGrafana --resource-group myRG --query identity.principalId -o tsv)

az role assignment create \
  --assignee $GRAFANA_IDENTITY \
  --role "Monitoring Reader" \
  --scope "/subscriptions/<sub-id>"
```

Azure Monitor is pre-configured as a data source in Azure Managed Grafana. You can also add Prometheus, Log Analytics, and Application Insights as additional data sources.

## Understanding Grafana Alerting Components

Grafana alerting has four main components:

1. **Alert rules**: Define the condition to evaluate (query + threshold)
2. **Contact points**: Define where notifications go (email, Slack, PagerDuty, webhooks, etc.)
3. **Notification policies**: Route alerts to specific contact points based on labels
4. **Silences**: Temporarily mute alerts during maintenance

The flow is: Alert Rule fires > Notification Policy routes it > Contact Point delivers the notification.

## Step 1: Configure Contact Points

Before creating alert rules, set up where notifications will be sent.

In the Grafana UI:

1. Go to Alerting > Contact points
2. Click "New contact point"
3. Give it a name (e.g., "Ops Team Slack")
4. Select the integration type

**Slack contact point**:

- Type: Slack
- Webhook URL: Your Slack incoming webhook URL
- Channel: #ops-alerts
- Title: `{{ template "default.title" . }}`
- Message: `{{ template "default.message" . }}`

**Email contact point**:

- Type: Email
- Addresses: ops-team@company.com
- Subject: Optional custom subject

**PagerDuty contact point**:

- Type: PagerDuty
- Integration Key: Your PagerDuty integration key
- Severity: Critical

**Webhook contact point** (for custom integrations):

- Type: Webhook
- URL: https://your-api.company.com/alerts
- HTTP Method: POST
- Add custom headers for authentication

You can also use the Grafana API to create contact points:

```bash
# Create a Slack contact point via the Grafana API
GRAFANA_URL=$(az grafana show --name myGrafana --resource-group myRG --query properties.endpoint -o tsv)

curl -X POST "$GRAFANA_URL/api/v1/provisioning/contact-points" \
  -H "Authorization: Bearer <grafana-service-account-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ops Team Slack",
    "type": "slack",
    "settings": {
      "url": "https://hooks.slack.com/services/T00/B00/xxx",
      "recipient": "#ops-alerts",
      "title": "{{ template \"default.title\" . }}",
      "text": "{{ template \"default.message\" . }}"
    }
  }'
```

## Step 2: Create Alert Rules for Azure Monitor Metrics

Navigate to Alerting > Alert rules > New alert rule.

**Example: Alert on high CPU usage across VMs**

1. Name: "High CPU - VMs"
2. Query: Select Azure Monitor as the data source
   - Resource type: Microsoft.Compute/virtualMachines
   - Metric: Percentage CPU
   - Aggregation: Average
   - Time grain: 5 minutes
3. Expression: Set threshold
   - When average of query > 90
4. Evaluation: Every 5 minutes, for 10 minutes (fires only if condition persists for 10 minutes)
5. Labels: Add `severity: warning`, `team: infrastructure`
6. Annotations: Add summary and description

**Example: Alert on low disk space**

1. Name: "Low Disk Space - VMs"
2. Query: Azure Monitor
   - Resource type: Microsoft.Compute/virtualMachines
   - Metric: OS Disk Used Percentage
   - Aggregation: Maximum
3. Expression: When max of query > 85
4. Evaluation: Every 15 minutes, for 15 minutes
5. Labels: `severity: critical`, `team: infrastructure`

## Step 3: Create Multi-Condition Alert Rules

Grafana allows you to combine multiple queries in a single alert rule. This is useful for reducing false positives.

**Alert on high CPU only when memory is also under pressure**:

1. Create Query A: Percentage CPU > 90
2. Create Query B: Available Memory MB < 512
3. Add a Math expression: `$A && $B` (both conditions must be true)
4. Set the threshold on the combined expression

This prevents alerting on a CPU spike during a planned batch job that does not affect memory, focusing on actual resource exhaustion situations.

## Step 4: Create Alert Rules for Log Analytics Data

Add Log Analytics as a data source in Grafana, then create alert rules using KQL queries.

1. Go to Configuration > Data sources > Add data source > Azure Log Analytics
2. Enter your Log Analytics workspace details

Create an alert rule:

```
Query A (Log Analytics):
  Heartbeat
  | summarize LastHeartbeat = max(TimeGenerated) by Computer
  | where LastHeartbeat < ago(10m)
  | count
```

Expression: When count > 0 (any VM stopped sending heartbeats)

Evaluation: Every 5 minutes

This is powerful because you can write any KQL query as an alert condition, giving you the same flexibility as Azure Monitor log alerts but managed within Grafana.

## Step 5: Configure Notification Policies

Notification policies route alerts to the right contact point based on alert labels.

Default policy:
- Contact point: Ops Team Email (catch-all)

Additional policies:
- When `severity = critical` AND `team = infrastructure`, route to PagerDuty
- When `severity = warning` AND `team = infrastructure`, route to Slack
- When `team = application`, route to Dev Team Slack

Configure this in the Grafana UI:

1. Go to Alerting > Notification policies
2. Edit the default policy to set your catch-all contact point
3. Add nested policies with matchers for specific label combinations

```bash
# Create a notification policy via the API
curl -X PUT "$GRAFANA_URL/api/v1/provisioning/policies" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "ops-email",
    "routes": [
      {
        "receiver": "pagerduty-critical",
        "matchers": ["severity=critical", "team=infrastructure"],
        "continue": false
      },
      {
        "receiver": "slack-ops",
        "matchers": ["severity=warning", "team=infrastructure"],
        "continue": false
      },
      {
        "receiver": "slack-devs",
        "matchers": ["team=application"],
        "continue": false
      }
    ]
  }'
```

## Step 6: Create Alert Rules from Dashboard Panels

If you already have dashboards with panels showing the metrics you want to alert on, you can create alert rules directly from those panels.

1. Open a dashboard panel showing a metric (e.g., a CPU usage chart)
2. Click the panel title > Edit
3. Go to the Alert tab
4. Click "Create alert rule from this panel"
5. The query is pre-populated from the panel
6. Add your threshold and evaluation settings
7. Save

This is the fastest way to add alerting to existing dashboards.

## Step 7: Set Up Silences for Maintenance

During planned maintenance, silence alerts to avoid noise:

1. Go to Alerting > Silences
2. Click "New silence"
3. Add matchers to target specific alerts (e.g., `team = infrastructure`)
4. Set the start and end time
5. Add a comment explaining the maintenance
6. Create

You can also create silences via the API for automation:

```bash
# Create a 2-hour silence for infrastructure alerts
curl -X POST "$GRAFANA_URL/api/v1/provisioning/mute-timings" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "maintenance-window",
    "time_intervals": [{
      "times": [{"start_time": "02:00", "end_time": "04:00"}],
      "weekdays": ["saturday"]
    }]
  }'
```

## Step 8: Use Grafana Alerting with Prometheus

If you use Azure Monitor managed service for Prometheus (or self-hosted Prometheus), you can create PromQL-based alert rules in Grafana.

Add Prometheus as a data source, then create rules:

**Alert on high error rate**:

```
Query A (Prometheus):
  rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
```

This fires when the 5xx error rate exceeds 5%.

**Alert on high pod memory usage**:

```
Query A (Prometheus):
  container_memory_usage_bytes{namespace="production"} / container_spec_memory_limit_bytes{namespace="production"} > 0.9
```

## Testing Your Alerts

Before relying on alerts in production, test them:

1. **Test contact points**: Go to Contact points > click "Test" on each one. This sends a test notification.
2. **Manually trigger rules**: Temporarily set a threshold that your current data already exceeds. Verify the notification arrives.
3. **Check notification routing**: Create test alerts with different labels and verify they reach the correct contact points.
4. **Test silences**: Create a silence, trigger an alert, and verify it is suppressed.

## Best Practices

- **Use pending periods**: Set alert rules to require the condition to persist for at least 5-10 minutes before firing. This eliminates transient spikes.
- **Label everything**: Labels are the foundation of notification routing. Use consistent labels for team, severity, and environment.
- **Avoid duplicate alerting**: If you also have Azure Monitor alerts, be deliberate about which system owns which alerts to avoid duplicate notifications.
- **Review regularly**: Alerts that never fire might have thresholds set too high. Alerts that fire constantly and get ignored need adjustment.

## Summary

Azure Managed Grafana provides a complete alerting pipeline that integrates with Azure Monitor, Log Analytics, Prometheus, and custom data sources. The combination of flexible alert rules, configurable contact points, and label-based notification routing gives you precise control over who gets notified about what. Set up your contact points first, create alert rules tied to meaningful thresholds, configure notification policies for routing, and test everything before relying on it for production incident detection.
