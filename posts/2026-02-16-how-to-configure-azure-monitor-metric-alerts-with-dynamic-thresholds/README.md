# How to Configure Azure Monitor Metric Alerts with Dynamic Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Metric Alerts, Dynamic Thresholds, Cloud Monitoring, Azure Alerts, Anomaly Detection

Description: Step-by-step guide to configuring Azure Monitor metric alerts with dynamic thresholds that automatically learn normal patterns and detect anomalies.

---

Static alert thresholds are a headache. You set CPU at 80%, and you get woken up at 3 AM because a perfectly normal batch job ran. Or you set it at 95% and miss a real issue because the server usually sits at 20%. Dynamic thresholds in Azure Monitor solve this by using machine learning to learn what "normal" looks like for each metric and then alerting when the metric deviates from that pattern.

This post covers how to set up metric alerts with dynamic thresholds, when to use them instead of static thresholds, and how to tune sensitivity to avoid alert fatigue.

## How Dynamic Thresholds Work

When you create a metric alert with dynamic thresholds, Azure Monitor looks at the historical data for that metric (at least 3 days, ideally more) and builds a model of its expected behavior. This model accounts for daily patterns (like lower traffic at night), weekly patterns (like reduced activity on weekends), and gradual trends (like steadily increasing storage usage).

The alert fires when the actual metric value falls outside the expected range. You control how far outside is "too far" by setting the sensitivity level.

There are three sensitivity options:

- **High** - Tight boundaries. Will catch smaller deviations but may produce more alerts.
- **Medium** - Balanced. Good starting point for most metrics.
- **Low** - Wide boundaries. Only fires on major deviations. Good for noisy metrics.

## Prerequisites

Before you begin, make sure:

- The resource you want to monitor is emitting metrics (most Azure resources do this automatically).
- The metric you want to alert on has at least 3 days of historical data. Dynamic thresholds need this baseline to build an accurate model.
- You have an action group configured for receiving notifications (email, SMS, webhook, etc.).

## Step 1: Create a Dynamic Threshold Alert in the Azure Portal

1. Go to **Azure Monitor** in the portal.
2. Click **Alerts** in the left menu, then click **Create** and select **Alert rule**.
3. Click **Select a resource** and pick the resource you want to monitor. For this example, let us use a virtual machine.
4. Click **Done** once selected.

Now configure the condition:

5. Under **Condition**, click **Add condition**.
6. Search for and select the metric you want - for example, **Percentage CPU**.
7. Under **Alert logic**, change **Threshold** from **Static** to **Dynamic**.
8. Set the **Operator**:
   - **Greater than** - Alert when the metric is above the expected upper bound.
   - **Less than** - Alert when the metric is below the expected lower bound.
   - **Greater or less than** - Alert on any deviation in either direction.
9. Set **Sensitivity** to **Medium** (you can adjust later).
10. Under **Advanced options**, configure:
    - **Number of violations** - How many data points must be anomalous before firing. Setting this to "3 out of 5" means 3 out of the last 5 evaluation periods must be anomalous.
    - **Look back period** - How far back the model looks when evaluating. This determines the evaluation window.
11. Click **Done**.

## Step 2: Configure the Action Group

Under **Actions**, click **Add action group** and select an existing one or create a new one. Action groups define who gets notified and how. You can configure email, SMS, voice calls, push notifications, webhooks, Logic Apps, Azure Functions, and ITSM integrations.

## Step 3: Configure Alert Rule Details

Under **Details**:

1. Select the **Subscription** and **Resource group** for the alert rule.
2. Set the **Severity** (0 = Critical, 1 = Error, 2 = Warning, 3 = Informational, 4 = Verbose).
3. Give the alert rule a descriptive **Name**, like "VM CPU Anomaly - web-prod-01".
4. Optionally add a **Description** explaining what the alert means and what to do.
5. Click **Create alert rule**.

## Setting Up Dynamic Threshold Alerts with Azure CLI

For automation, the Azure CLI lets you create these alerts programmatically. Here is an example for CPU on a VM.

```bash
# Define variables
RESOURCE_ID="/subscriptions/<sub-id>/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/web-prod-01"
ACTION_GROUP_ID="/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.Insights/actionGroups/ops-team"

# Create the metric alert with dynamic threshold
az monitor metrics alert create \
  --name "vm-cpu-anomaly" \
  --resource-group rg-monitoring \
  --scopes "$RESOURCE_ID" \
  --condition "avg Percentage CPU > dynamic medium 3 of 5 since 2023-01-01" \
  --action "$ACTION_GROUP_ID" \
  --severity 2 \
  --description "Fires when CPU usage deviates from the learned normal pattern" \
  --evaluation-frequency 5m \
  --window-size 15m
```

The condition syntax for dynamic thresholds follows this pattern: `{aggregation} {metric} {operator} dynamic {sensitivity} {violations} of {total} since {date}`.

## Setting Up with an ARM Template

For infrastructure-as-code deployments, here is the ARM template structure for a dynamic threshold metric alert.

```json
{
  "type": "Microsoft.Insights/metricAlerts",
  "apiVersion": "2018-03-01",
  "name": "vm-cpu-dynamic-alert",
  "location": "global",
  "properties": {
    "severity": 2,
    "enabled": true,
    "scopes": [
      "[parameters('vmResourceId')]"
    ],
    "evaluationFrequency": "PT5M",
    "windowSize": "PT15M",
    "criteria": {
      "odata.type": "Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria",
      "allOf": [
        {
          "criterionType": "DynamicThresholdCriterion",
          "name": "cpu-anomaly",
          "metricName": "Percentage CPU",
          "metricNamespace": "Microsoft.Compute/virtualMachines",
          "operator": "GreaterThan",
          "timeAggregation": "Average",
          "alertSensitivity": "Medium",
          "failingPeriods": {
            "numberOfEvaluationPeriods": 5,
            "minFailingPeriodsToAlert": 3
          }
        }
      ]
    },
    "actions": [
      {
        "actionGroupId": "[parameters('actionGroupId')]"
      }
    ]
  }
}
```

## When to Use Dynamic vs Static Thresholds

Dynamic thresholds are not always the right choice. Here is a quick decision guide.

**Use dynamic thresholds when:**

- The metric has a predictable daily or weekly pattern (web traffic, batch processing schedules).
- You do not know what "normal" looks like for a new workload.
- You are tired of tuning static thresholds that keep generating false positives.
- You want to catch gradual degradation that would not breach a static threshold.

**Use static thresholds when:**

- There is a hard limit that should never be crossed (disk space below 10%, connection pool at maximum).
- The metric does not have enough history (less than 3 days of data).
- You need deterministic, predictable alert behavior for compliance reasons.
- The metric is inherently random with no discernible pattern.

## Tuning Sensitivity

After the alert has been running for a few days, review the alert history. Go to **Azure Monitor > Alerts** and filter by your alert rule.

If you are getting too many alerts (false positives), reduce the sensitivity from High to Medium, or Medium to Low. You can also increase the number of violations required - changing from "1 of 1" to "3 of 5" means the metric must be anomalous in at least 3 of the last 5 evaluation periods before the alert fires.

If you are missing real issues (false negatives), increase the sensitivity or reduce the number of required violations.

The evaluation frequency and window size also matter. A 5-minute frequency with a 15-minute window checks the metric every 5 minutes using the last 15 minutes of data. If you make the window too short, you will get noise from momentary spikes. If you make it too long, you will miss short-lived issues.

## Multi-Resource Dynamic Alerts

One powerful feature is the ability to apply a single dynamic threshold alert to multiple resources of the same type. Instead of creating one alert per VM, you can scope the alert to a resource group or subscription and have it monitor every VM at once.

Each VM gets its own learned baseline. So "normal" for a web server and "normal" for a database server will be different, even though they share the same alert rule.

To do this in the portal, when selecting the scope, choose the resource group or subscription and filter by resource type. The alert engine handles the rest.

## Monitoring the Dynamic Threshold Model

You can preview what the dynamic threshold boundaries look like before creating the alert. In the condition configuration screen, the portal shows a chart with the actual metric values and the computed upper and lower bounds. Use this preview to validate that the model makes sense for your workload.

If the model looks off - for example, if you recently changed your application deployment schedule and the old pattern no longer applies - you can set the "Ignore data before" option to tell the model to only learn from recent data.

## Cost Considerations

Metric alerts in Azure Monitor are billed per alert rule per month. Dynamic threshold alerts cost slightly more than static ones because of the machine learning component. As of the current pricing, a standard metric alert costs roughly $0.10 per month per signal, while dynamic threshold alerts cost around $1.00 per month per signal. For a small number of alerts, the difference is negligible. But if you are creating hundreds of alert rules, static thresholds may be more cost-effective for simple cases.

## Wrapping Up

Dynamic thresholds are one of the most practical features in Azure Monitor. They remove the guesswork from alert configuration and adapt as your workload changes. Start with Medium sensitivity and "3 of 5" violation settings, monitor the alert behavior for a week, and then adjust. Combine them with static thresholds for hard limits, and you will have a robust alerting setup that catches real problems without drowning your team in noise.
