# How to Migrate Azure Monitor Alerts to Google Cloud Monitoring Alerting Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Alerting, Azure Migration, Observability, Monitoring

Description: Learn how to migrate your Azure Monitor alert rules and action groups to Google Cloud Monitoring alerting policies and notification channels.

---

When moving infrastructure from Azure to Google Cloud, migrating your monitoring and alerting setup is one of the last things teams tackle but one of the most important for day-two operations. Azure Monitor Alerts and Google Cloud Monitoring Alerting Policies serve the same purpose - notifying you when something goes wrong - but they have different configuration models, metric naming conventions, and notification mechanisms.

## Concept Mapping

Before diving into the technical steps, let's establish how Azure Monitor concepts translate to Google Cloud Monitoring:

| Azure Monitor | Google Cloud Monitoring |
|---------------|----------------------|
| Alert rule | Alerting policy |
| Action group | Notification channel |
| Signal (metric/log) | Metric or log-based metric |
| Metric alert | Metric-based alerting policy |
| Log alert (Log Analytics) | Log-based metric + alerting policy |
| Activity log alert | Audit log + alerting policy |
| Smart detection | Anomaly detection (limited) |
| Alert severity (0-4) | No severity levels (custom labels) |
| Dynamic thresholds | No direct equivalent (MQL forecasting) |

One notable difference: Azure Monitor has built-in dynamic thresholds that use machine learning to detect anomalies. Google Cloud Monitoring does not have a direct equivalent, though you can use Monitoring Query Language (MQL) with forecasting functions for similar effect.

## Step 1: Inventory Your Azure Alerts

Export your Azure Monitor alert configuration:

```bash
# List all alert rules in a subscription
az monitor metrics alert list --output table

# List all log alert rules
az monitor scheduled-query list --output table

# List all action groups
az monitor action-group list --output table

# Export a specific metric alert rule
az monitor metrics alert show \
    --name "High CPU Alert" \
    --resource-group my-rg \
    --output json > alert-high-cpu.json
```

For each alert, document:
- What metric or log query it monitors
- The threshold and evaluation window
- Which action group it triggers (email, webhook, PagerDuty, etc.)
- The severity level

## Step 2: Set Up Notification Channels

Notification channels in Google Cloud Monitoring replace Azure Action Groups. Create channels for each notification method you use.

```bash
# Create an email notification channel
gcloud monitoring channels create \
    --display-name="Ops Team Email" \
    --type=email \
    --channel-labels=email_address=ops-team@example.com

# Create a Slack notification channel
gcloud monitoring channels create \
    --display-name="Alerts Slack Channel" \
    --type=slack \
    --channel-labels=channel_name="#alerts" \
    --channel-labels=auth_token="xoxb-your-slack-token"

# Create a PagerDuty notification channel
gcloud monitoring channels create \
    --display-name="PagerDuty Ops" \
    --type=pagerduty \
    --channel-labels=service_key="your-pagerduty-integration-key"

# Create a webhook notification channel
gcloud monitoring channels create \
    --display-name="Custom Webhook" \
    --type=webhook_tokenauth \
    --channel-labels=url="https://hooks.example.com/alerts"

# List all notification channels to get their IDs
gcloud monitoring channels list --format="table(name, displayName, type)"
```

## Step 3: Migrate Metric Alerts

This is where you convert Azure metric alert rules to Cloud Monitoring alerting policies. Let me walk through the most common types.

### CPU Usage Alert

Azure metric alert for high CPU:

```json
{
    "criteria": {
        "metricName": "Percentage CPU",
        "operator": "GreaterThan",
        "threshold": 80,
        "timeAggregation": "Average",
        "dimensions": []
    },
    "windowSize": "PT5M",
    "evaluationFrequency": "PT1M"
}
```

The equivalent Google Cloud Monitoring alerting policy, created using gcloud:

```bash
# Create a CPU usage alerting policy
# Replaces Azure "Percentage CPU > 80%" metric alert
gcloud monitoring policies create \
    --display-name="High CPU Usage" \
    --condition-display-name="CPU above 80% for 5 minutes" \
    --condition-filter='resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/cpu/utilization"' \
    --condition-threshold-value=0.8 \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-threshold-duration=300s \
    --condition-threshold-aggregation='{"alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_MEAN"}' \
    --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
    --documentation-content="CPU utilization exceeded 80% threshold. Check for runaway processes or consider scaling."
```

### Memory Usage Alert

For memory monitoring, Cloud Monitoring uses the Ops Agent metrics:

```bash
# Create a memory usage alerting policy
gcloud monitoring policies create \
    --display-name="High Memory Usage" \
    --condition-display-name="Memory above 90% for 5 minutes" \
    --condition-filter='resource.type="gce_instance" AND metric.type="agent.googleapis.com/memory/percent_used" AND metric.labels.state="used"' \
    --condition-threshold-value=90 \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-threshold-duration=300s \
    --condition-threshold-aggregation='{"alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_MEAN"}' \
    --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID"
```

### Disk Space Alert

```bash
# Create a disk usage alerting policy
gcloud monitoring policies create \
    --display-name="Low Disk Space" \
    --condition-display-name="Disk usage above 85%" \
    --condition-filter='resource.type="gce_instance" AND metric.type="agent.googleapis.com/disk/percent_used" AND metric.labels.state="used"' \
    --condition-threshold-value=85 \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-threshold-duration=300s \
    --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID"
```

## Step 4: Migrate Log-Based Alerts

Azure Log Analytics alerts query log data using KQL. Google Cloud uses log-based metrics that you then alert on, or you can use log-based alerting policies directly.

### Using Log-Based Metrics

First, create a log-based metric that counts specific log entries:

```bash
# Create a log-based metric for error counting
# This replaces an Azure Log Analytics alert that queries for errors
gcloud logging metrics create error-count \
    --description="Count of application errors" \
    --log-filter='resource.type="gce_instance" AND severity="ERROR"'

# Then create an alerting policy on that metric
gcloud monitoring policies create \
    --display-name="High Error Rate" \
    --condition-display-name="More than 10 errors in 5 minutes" \
    --condition-filter='resource.type="gce_instance" AND metric.type="logging.googleapis.com/user/error-count"' \
    --condition-threshold-value=10 \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-threshold-duration=300s \
    --condition-threshold-aggregation='{"alignmentPeriod": "300s", "perSeriesAligner": "ALIGN_SUM"}' \
    --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID"
```

### Using Log-Based Alerting Policies Directly

For simpler cases, you can alert directly on log entries without creating a metric first:

```bash
# Create a log-based alerting policy using the API
# This fires when a specific log pattern appears
curl -X POST \
    "https://monitoring.googleapis.com/v3/projects/my-project/alertPolicies" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "displayName": "Critical Application Error",
        "conditions": [{
            "displayName": "Log match for critical errors",
            "conditionMatchedLog": {
                "filter": "resource.type=\"gce_instance\" AND jsonPayload.level=\"CRITICAL\" AND jsonPayload.service=\"payment-service\"",
                "labelExtractors": {
                    "error_message": "EXTRACT(jsonPayload.message)"
                }
            }
        }],
        "alertStrategy": {
            "notificationRateLimit": {
                "period": "300s"
            },
            "autoClose": "604800s"
        },
        "notificationChannels": [
            "projects/my-project/notificationChannels/CHANNEL_ID"
        ],
        "documentation": {
            "content": "A critical error was logged by the payment service. Check Cloud Logging for details.",
            "mimeType": "text/markdown"
        }
    }'
```

## Step 5: Migrate Uptime Checks

Azure Application Insights availability tests map to Google Cloud Monitoring uptime checks:

```bash
# Create an HTTPS uptime check
# Replaces Azure Application Insights URL ping test
gcloud monitoring uptime create my-api-check \
    --display-name="API Health Check" \
    --resource-type=uptime-url \
    --monitored-resource-labels=host=api.example.com \
    --protocol=HTTPS \
    --path="/health" \
    --check-every=60s \
    --timeout=10s \
    --regions=USA,EUROPE,ASIA_PACIFIC

# Create an alerting policy for the uptime check
gcloud monitoring policies create \
    --display-name="API Down Alert" \
    --condition-display-name="API health check failing" \
    --condition-filter='resource.type="uptime_url" AND metric.type="monitoring.googleapis.com/uptime_check/check_passed"' \
    --condition-threshold-value=1 \
    --condition-threshold-comparison=COMPARISON_LT \
    --condition-threshold-duration=300s \
    --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID"
```

## Step 6: Handling Alert Severity

Azure Monitor has built-in severity levels (0-Critical through 4-Verbose). Cloud Monitoring does not have native severity, but you can use labels and documentation to organize alerts:

```bash
# Use user labels to categorize alert severity
gcloud monitoring policies create \
    --display-name="[P1] Database Connection Failures" \
    --user-labels="severity=critical,team=database" \
    --condition-display-name="Connection failures above threshold" \
    --condition-filter='metric.type="custom.googleapis.com/database/connection_errors"' \
    --condition-threshold-value=5 \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-threshold-duration=60s \
    --notification-channels="projects/my-project/notificationChannels/PAGERDUTY_CHANNEL_ID" \
    --documentation-content="**Priority: P1 - Critical**\n\nDatabase connection failures detected. Immediate action required."
```

## Automation with Terraform

For large-scale migrations, use Terraform to define all your alerting policies as code:

```hcl
# Terraform definition for a Cloud Monitoring alerting policy
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Usage"
  combiner     = "OR"

  conditions {
    display_name = "CPU above 80%"
    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.ops_email.name]

  documentation {
    content   = "CPU utilization exceeded threshold. Review instance performance."
    mime_type = "text/markdown"
  }
}
```

## Conclusion

Migrating alerts is mostly a mapping exercise - translating Azure metric names to GCP metric names, converting KQL log queries to Cloud Logging filter syntax, and recreating notification targets. The biggest differences are the lack of built-in dynamic thresholds in Cloud Monitoring and the different approach to log-based alerting. Take time to test each alert by simulating the conditions it should catch, and keep your Azure alerts active in parallel until you are confident the GCP alerts are working correctly.
