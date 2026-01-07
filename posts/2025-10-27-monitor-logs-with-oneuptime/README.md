# Monitor Logs with OneUptime: Stay Ahead of Issues in Plain English

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Logs, Logging, DevOps

Description: Learn how to create, tune, and act on OneUptime log monitors as an end user- no code or internal tooling knowledge required.

---

Log monitors keep a constant eye on the messages your applications send. When something unusual happens- errors spike, heartbeats disappear, or partners start failing- you get notified automatically. The experience is fully guided inside the dashboard, so you can set everything up with a few fields and a preview.

---

## What a log monitor gives you

- A rolling search over your log stream that reruns on a schedule you choose.
- Visual confirmation of what will match before you save anything.
- Automatic incidents or alerts when the number of matching logs crosses the threshold you set.
- Built-in history so you can spot trends and prove when the noise stopped.

---

## Create a log monitor step by step

1. **Open Monitors → New Monitor** and pick **Logs**.
2. **Give it a clear name** such as "Checkout errors" so teammates instantly know its purpose.
3. **Describe the log you care about** by filling in one or more of these fields:
   - Keywords or phrases that must appear.
   - How far back to look each time (for example, the last 1 minute or 15 minutes).
   - Optional filters like severity level, telemetry service, or specific log attributes (for example `env = production`).
4. **Use the preview panel** to confirm the monitor is catching the events you expect. Adjust filters until the preview looks right.
5. **Set how often to check** by choosing the monitoring interval (every minute, every five minutes, and so on).
6. **Review the default alert rule** (fires when at least one log matches) and add extra rules if needed, such as warning at 10 matches and critical at 50.
7. **Assign who should know** by connecting incidents to on-call policies, Slack channels, status pages, or automated workflows.
8. **Save** and let OneUptime handle the rest.

The following filter query syntax demonstrates how to target specific logs in your monitor configuration. These examples show common patterns for filtering by severity, service, and custom attributes.

```sql
-- Example log filter queries for OneUptime log monitors
-- Use these patterns in the filter field when creating a log monitor

-- Filter by severity level: catch only error and critical logs
severity IN ('error', 'critical', 'fatal')

-- Filter by service name: monitor a specific microservice
service.name = 'checkout-service' AND severity = 'error'

-- Filter by environment: only production issues
attributes.env = 'production' AND message CONTAINS 'timeout'

-- Combine multiple conditions: payment errors in production
service.name = 'payment-gateway'
    AND severity IN ('error', 'warning')
    AND attributes.env = 'production'
    AND message CONTAINS 'declined'

-- Exclude known noise: filter out health check logs
NOT (message CONTAINS 'health' OR message CONTAINS 'ping')
    AND severity = 'error'

-- Time-based patterns: detect missing heartbeat logs
-- Use with "count < 1" alert rule to detect absence
message CONTAINS 'heartbeat' AND service.name = 'scheduler'
```

Here is an example of how your application should structure log entries for optimal filtering. Consistent log formatting makes it easier to create precise monitors.

```json
{
    "timestamp": "2025-10-27T14:30:00.123Z",
    "severity": "error",
    "message": "Payment processing failed: card declined",
    "service": {
        "name": "payment-gateway",
        "version": "2.3.1"
    },
    "attributes": {
        "env": "production",
        "region": "us-east-1",
        "transaction_id": "txn_abc123",
        "error_code": "CARD_DECLINED",
        "customer_id": "cust_xyz789"
    },
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7"
}
```

---

## Everyday use cases

- **Catch error spikes quickly** by watching for messages that contain "error" or specific exception names.
- **Detect silent systems** by flagging when expected logs do not show up within the chosen window.
- **Verify releases** by keeping temporary monitors for launch keywords during the rollout window.
- **Watch partner integrations** with attribute filters (such as `partner = shipping`) so third-party issues never surprise you.

The following monitor configuration JSON shows how a complete log monitor is structured. This example detects checkout errors in production and triggers alerts when the error count exceeds thresholds.

```json
{
    "monitor": {
        "name": "Checkout Errors - Production",
        "type": "logs",
        "description": "Alerts when checkout errors spike in production environment",

        "filter": {
            "query": "service.name = 'checkout-service' AND severity = 'error'",
            "timeWindow": "5m",
            "attributes": {
                "env": "production"
            }
        },

        "schedule": {
            "interval": "1m"
        },

        "alertRules": [
            {
                "name": "Warning",
                "condition": "count >= 10",
                "severity": "warning",
                "message": "Elevated checkout errors detected"
            },
            {
                "name": "Critical",
                "condition": "count >= 50",
                "severity": "critical",
                "message": "Checkout error spike - immediate attention required"
            }
        ],

        "notifications": {
            "onCall": "platform-team",
            "slack": "#checkout-alerts",
            "statusPage": "checkout-component"
        }
    }
}
```

---

## Tips for reliable alerts

- Start with a short time window (one or five minutes) for fast detection. Widen it later if you need more smoothing.
- Use the preview before saving every change. It shows exactly what will trigger.
- Layer multiple alert levels. A warning can start a conversation; a critical alert should wake someone up.
- Revisit the monitor timeline after incidents to tune thresholds and remove noise.

---

## Troubleshooting fast

- **Getting too many alerts?** Tighten the filters or raise the required count before alerts fire.
- **Not seeing any matches?** Expand the time window or remove extra filters to confirm the log is still being written.
- **Need to pause alerts?** Put the monitor into maintenance mode directly from the incident or monitor view.

---

Log monitors put the right information in front of the right people without touching code. Combine them with metric and trace monitors for a complete picture, and let OneUptime handle the repetitive work of watching your logs every minute of every day.
