# How to Set Up Autoscale Rules in Azure Monitor for Azure App Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Autoscale, Azure App Service, Cloud Scaling, Performance Optimization, Azure Infrastructure

Description: A hands-on guide to configuring autoscale rules in Azure Monitor for App Services so your application scales automatically based on demand.

---

Manually scaling your App Service plan up and down based on traffic is tedious and error-prone. You either overprovision and waste money, or underprovision and get slow responses during peak hours. Azure Monitor autoscale solves this by automatically adjusting the instance count based on metrics like CPU usage, memory, HTTP queue length, or even custom metrics.

In this guide, I will walk through setting up autoscale rules for an Azure App Service from scratch, covering both the portal and infrastructure-as-code approaches. We will also look at schedule-based scaling and some common pitfalls that can cause unexpected behavior.

## How Autoscale Works

Autoscale in Azure Monitor operates on App Service plans (not individual apps). When you configure autoscale, you define:

1. **Instance limits** - The minimum, maximum, and default number of instances.
2. **Scale-out rules** - Conditions under which to add instances (e.g., when average CPU exceeds 70%).
3. **Scale-in rules** - Conditions under which to remove instances (e.g., when average CPU drops below 30%).
4. **Cool down periods** - How long to wait after a scaling action before evaluating again.

The autoscale engine evaluates rules every few minutes. When a scale-out condition is met, it adds instances up to the maximum. When a scale-in condition is met, it removes instances down to the minimum.

## Prerequisites

- An Azure App Service running on a **Standard** or **Premium** tier plan. The Free, Shared, and Basic tiers do not support autoscale.
- Contributor access to the resource group containing the App Service plan.

## Step 1: Enable Autoscale in the Portal

1. Navigate to your **App Service plan** in the Azure portal (not the App Service itself - scaling is done at the plan level).
2. In the left menu, click **Scale out (App Service plan)** under **Settings**.
3. You will see three options:
   - **Manual scale** - Fixed instance count.
   - **Custom autoscale** - Rule-based or schedule-based scaling.
4. Select **Custom autoscale**.
5. Give the autoscale setting a name.

## Step 2: Configure the Default Scale Condition

Under the default scale condition:

1. Set the **Instance limits**:
   - **Minimum**: 2 (always have at least 2 for availability).
   - **Maximum**: 10 (cap spending).
   - **Default**: 2 (used when no metrics are available).

Now add a scale-out rule:

2. Click **Add a rule**.
3. Configure the rule:
   - **Metric source**: Current resource (your App Service plan).
   - **Metric name**: CPU Percentage.
   - **Time aggregation**: Average.
   - **Operator**: Greater than.
   - **Threshold**: 70.
   - **Duration**: 10 minutes (the metric must exceed the threshold for this long).
   - **Time grain (statistic)**: Average over 1 minute.
   - **Operation**: Increase count by 1.
   - **Cool down**: 5 minutes.
4. Click **Add**.

Now add a corresponding scale-in rule:

5. Click **Add a rule** again.
6. Configure:
   - **Metric name**: CPU Percentage.
   - **Operator**: Less than.
   - **Threshold**: 30.
   - **Duration**: 10 minutes.
   - **Operation**: Decrease count by 1.
   - **Cool down**: 10 minutes (longer cool down for scale-in to avoid flapping).
7. Click **Add**.

Click **Save** at the top.

## Step 3: Add HTTP-Based Scale Rules

CPU is not always the best signal for web applications. HTTP queue length and request count can be more responsive indicators of load.

Add another scale-out rule:

- **Metric name**: Http Queue Length.
- **Operator**: Greater than.
- **Threshold**: 100.
- **Duration**: 5 minutes.
- **Operation**: Increase count by 2.
- **Cool down**: 5 minutes.

And a scale-in rule:

- **Metric name**: Http Queue Length.
- **Operator**: Less than.
- **Threshold**: 10.
- **Duration**: 10 minutes.
- **Operation**: Decrease count by 1.
- **Cool down**: 10 minutes.

When you have multiple scale-out rules, autoscale fires if ANY rule is met. For scale-in, ALL rules must be met. This asymmetry is by design - it is better to scale out aggressively and scale in conservatively.

## Step 4: Add Schedule-Based Scaling

If you know your traffic patterns, you can add schedule-based scaling profiles. For example, if you know traffic spikes every weekday from 9 AM to 6 PM, you can pre-scale.

1. In the autoscale settings, click **Add a scale condition**.
2. Select **Scale based on a schedule**.
3. Set:
   - **Instance limits**: Minimum 4, Maximum 10, Default 4.
   - **Schedule**: Repeat specific days - Monday through Friday.
   - **Start time**: 08:30.
   - **End time**: 18:30.
   - **Timezone**: Your local timezone.
4. Click **Add**.

During the scheduled window, the minimum instance count is 4 instead of 2, so you have extra capacity ready before the traffic arrives.

## Setting Up Autoscale with Azure CLI

Here is the equivalent setup using the Azure CLI.

```bash
# Get the App Service plan resource ID
ASP_ID=$(az appservice plan show \
  --name asp-prod \
  --resource-group rg-web \
  --query id -o tsv)

# Create the autoscale setting with a default profile
az monitor autoscale create \
  --resource-group rg-web \
  --name "web-autoscale" \
  --resource "$ASP_ID" \
  --min-count 2 \
  --max-count 10 \
  --count 2

# Add a scale-out rule for CPU
az monitor autoscale rule create \
  --resource-group rg-web \
  --autoscale-name "web-autoscale" \
  --condition "CpuPercentage > 70 avg 10m" \
  --scale out 1 \
  --cooldown 5

# Add a scale-in rule for CPU
az monitor autoscale rule create \
  --resource-group rg-web \
  --autoscale-name "web-autoscale" \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1 \
  --cooldown 10
```

## Setting Up with an ARM Template

For infrastructure-as-code, here is a Bicep snippet that configures autoscale.

```
// Bicep resource definition for autoscale settings
resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'web-autoscale'
  location: resourceGroup().location
  properties: {
    enabled: true
    targetResourceUri: appServicePlan.id
    profiles: [
      {
        name: 'default'
        capacity: {
          minimum: '2'
          maximum: '10'
          default: '2'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}
```

## Understanding Scale-Out and Scale-In Logic

This is where most people get confused. The logic works as follows:

**Scale-out**: If ANY scale-out rule evaluates to true, autoscale adds instances. This is an OR operation across rules.

**Scale-in**: ALL scale-in rules must evaluate to true before autoscale removes instances. This is an AND operation.

So if you have two rules - one based on CPU and one based on HTTP queue length - the system scales out when either metric spikes, but only scales in when both metrics are calm. This prevents premature scale-in when one metric is fine but the other is still elevated.

## Flapping Prevention

Flapping is when the system rapidly scales out and back in. To prevent this:

1. **Use asymmetric thresholds**: Scale out at 70% CPU but scale in at 30%, not 69%. The gap between thresholds prevents oscillation.
2. **Longer cool-down for scale-in**: If your scale-out cool-down is 5 minutes, set scale-in to 10 or 15 minutes.
3. **Sufficient duration windows**: Require the metric to breach the threshold for at least 10 minutes before acting.

## Monitoring Autoscale Activity

After enabling autoscale, you can track its decisions in the Activity Log. Filter by the operation "Autoscale scale up completed" or "Autoscale scale down completed". You can also set up an alert on autoscale failures.

```bash
# View recent autoscale events in the activity log
az monitor activity-log list \
  --resource-group rg-web \
  --caller "Microsoft.Insights/autoscaleSettings" \
  --offset 24h \
  --query "[].{Time:eventTimestamp, Operation:operationName.localizedValue, Status:status.localizedValue}" \
  -o table
```

## Common Pitfalls

**Wrong tier**: Autoscale only works on Standard, Premium, and Isolated tiers. If you are on Basic, you need to scale up first.

**Scaling the wrong resource**: Autoscale targets the App Service plan, not the app. If you configure autoscale on the wrong plan, nothing happens.

**No scale-in rules**: If you add scale-out rules without corresponding scale-in rules, your instances will grow but never shrink. Always pair them.

**Ignoring cold start**: New instances take time to warm up. If your application has a slow startup, consider pre-warming by setting higher minimum counts during peak hours.

**Instance limits too tight**: Setting both minimum and maximum to the same value effectively disables autoscale. The maximum must be greater than the minimum.

## Wrapping Up

Autoscale is one of the most cost-effective features in Azure. By automatically matching capacity to demand, you avoid paying for idle instances while still handling traffic spikes gracefully. Start with CPU-based rules, add HTTP queue length as a secondary signal, layer on schedule-based profiles for predictable patterns, and always pair scale-out rules with scale-in rules. Monitor the autoscale activity log for the first few weeks to make sure it behaves as expected, and adjust thresholds as needed.
