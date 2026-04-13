# How to Set Up Atlas Alerts and Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Alerting, Monitoring, Notification

Description: Configure MongoDB Atlas project alerts for cluster health, performance, and billing thresholds, and route notifications to email, Slack, or PagerDuty.

---

MongoDB Atlas includes a built-in alerting system that monitors dozens of metrics across your clusters, replica sets, and App Services applications. When a metric crosses a threshold you define, Atlas fires an alert and delivers notifications through your chosen channel.

## Navigating to Alerts

1. Open your Atlas project.
2. Click **Project Alerts** in the left sidebar.
3. Select the **Alert Settings** tab to view and create alert configurations.

## Built-in Alert Policies

Atlas ships several default alert policies:

| Policy | Default Threshold |
|--------|-------------------|
| Connections % utilized | > 80% |
| Replication Oplog Window | < 1 hour |
| Disk IOPS % utilized | > 90% |
| Query Targeting (scan/return ratio) | > 1000 |
| Credit card about to expire | 30 days before |

These are enabled automatically for new projects. You can edit or disable them at any time.

## Creating a Custom Alert

```text
Alert on: Host - Query Targeting: Scanned Objects / Returned > 100
Notify: Slack Webhook
```

Steps in the UI:

1. Click **Add** on the Alert Settings tab.
2. Choose the **Target** category (Host, Replica Set, Cluster, Billing, etc.).
3. Select the metric and set the threshold.
4. Choose one or more notification channels.
5. Optionally, set a **delay** to avoid flapping (e.g., trigger only if condition persists for 5 minutes).

## Configuring Slack Notifications

```bash
# Create a Slack incoming webhook in your Slack workspace
# Then add it in Atlas:

curl --user "$PUB_KEY:$PRIV_KEY" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  --data '{
    "typeName": "GROUP",
    "eventTypeName": "OUTSIDE_METRIC_THRESHOLD",
    "enabled": true,
    "notifications": [{
      "typeName": "SLACK",
      "apiToken": "<your-slack-api-token>",
      "channelName": "db-alerts"
    }],
    "metricThreshold": {
      "metricName": "SYSTEM_MEMORY_PERCENT_USED",
      "operator": "GREATER_THAN",
      "threshold": 90,
      "units": "RAW",
      "mode": "AVERAGE"
    }
  }' \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/$GROUP_ID/alertConfigs"
```

## Configuring PagerDuty Notifications

1. In PagerDuty, create a new service with an Events API v2 integration.
2. Copy the integration key.
3. In Atlas alert settings, add a **PagerDuty** notification and paste the integration key.

Atlas will open and resolve PagerDuty incidents automatically as alert conditions come and go.

## Acknowledging and Resolving Alerts

- **Acknowledge** an alert to suppress repeated notifications for a set period while you investigate.
- **Close** an alert manually if the condition resolves before Atlas detects the recovery.

Via API:

```bash
# Acknowledge alert for 4 hours
curl --user "$PUB_KEY:$PRIV_KEY" --digest \
  --request PATCH \
  --header "Content-Type: application/json" \
  --data '{"acknowledgedUntil": "2026-04-01T12:00:00Z", "acknowledgementComment": "Investigating"}' \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/$GROUP_ID/alerts/$ALERT_ID"
```

## Recommended Alert Thresholds

```text
- Connections % utilized    > 75%  (warn) / > 90% (critical)
- Disk space % used         > 75%
- Replication lag           > 10 seconds
- Query targeting ratio     > 100
- Oplog window              < 2 hours
- NormalizedSystemCPU       > 70%
```

## Summary

Atlas Alerts let you define metric thresholds and route notifications to email, Slack, PagerDuty, webhooks, and more. Start with the built-in policies, tune the thresholds to your workload, and pair critical alerts with an on-call rotation tool like PagerDuty for full incident coverage.
