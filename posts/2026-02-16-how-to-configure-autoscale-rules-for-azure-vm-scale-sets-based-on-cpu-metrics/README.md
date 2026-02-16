# How to Configure Autoscale Rules for Azure VM Scale Sets Based on CPU Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Autoscale, CPU Metrics, Cloud Scaling, Performance Optimization

Description: Learn how to set up CPU-based autoscale rules for Azure VM Scale Sets with proper thresholds, cooldowns, and scaling strategies.

---

Autoscaling is the whole point of using VM Scale Sets. You want the system to add instances when traffic picks up and remove them when things calm down, without anyone touching a keyboard. CPU-based autoscaling is the most common starting point because CPU utilization is a reliable indicator of load for most workloads, easy to measure, and available by default without custom instrumentation.

But getting autoscale right is trickier than it seems. Set the thresholds too aggressively and you get flapping - instances spinning up and down constantly. Set them too conservatively and your application suffers through traffic spikes before new instances arrive. This guide covers the practical details of CPU-based autoscale rules and how to tune them for real workloads.

## How Azure Autoscale Works

Azure Autoscale evaluates metrics at regular intervals (by default, every minute) and compares them against your rules. When a rule condition is met for the specified duration, the autoscale engine triggers a scale action.

The key components of an autoscale rule:

- **Metric source**: Which resource provides the metric (the scale set itself for CPU)
- **Metric name**: The specific metric (Percentage CPU)
- **Time grain**: The interval for metric data points (1 minute, 5 minutes, etc.)
- **Time aggregation**: How data points within the time grain are combined (Average, Min, Max, Sum)
- **Duration**: How long the condition must be true before triggering
- **Operator**: Comparison type (Greater than, Less than, etc.)
- **Threshold**: The value to compare against
- **Action**: What to do (increase or decrease instance count)
- **Cool down**: Minimum time between scale actions

## Setting Up Basic CPU Autoscale Rules

Here is a straightforward configuration using the Azure CLI. This sets up scale-out at 70% CPU and scale-in at 30% CPU.

```bash
# Create an autoscale profile with min/max instance counts
az monitor autoscale create \
  --resource-group myResourceGroup \
  --resource myScaleSet \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name cpu-autoscale \
  --min-count 2 \
  --max-count 10 \
  --count 3

# Add a scale-out rule: increase by 1 when avg CPU > 70% for 10 minutes
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU > 70 avg 10m" \
  --scale out 1

# Add a scale-in rule: decrease by 1 when avg CPU < 30% for 10 minutes
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU < 30 avg 10m" \
  --scale in 1
```

This is a good starting point, but let me explain why each number matters and how to tune them.

## Choosing the Right Thresholds

### Scale-Out Threshold

The 70% scale-out threshold is a common default, but the right number depends on your workload:

- **CPU-bound applications** (heavy computation, video encoding): Scale out at 60-70%. These applications become sluggish well before hitting 100% CPU.
- **I/O-bound applications** (web servers, API gateways): Scale out at 75-80%. These can handle higher CPU levels because the CPU is often idle waiting on I/O.
- **Mixed workloads**: Start at 70% and adjust based on observed user experience.

### Scale-In Threshold

The scale-in threshold should be well below the scale-out threshold. A gap between 30% and 70% is common. This gap prevents flapping, where a scale-out drops the average CPU (because there are now more instances), which triggers a scale-in, which raises the average CPU, which triggers a scale-out again.

A helpful rule of thumb: after scaling out by one instance, the average CPU should drop below the scale-in threshold. If your scale-out threshold is 70% and you add one instance to a set of three (going from 3 to 4), the CPU per instance drops to roughly 52% (70% * 3/4). Since 52% is above the 30% scale-in threshold, you will not immediately trigger a scale-in. That is the behavior you want.

## Advanced Scaling Rules

### Percentage-Based Scaling

Instead of adding one instance at a time, you can scale by a percentage. This is better for bursty traffic where you need to add several instances quickly.

```bash
# Scale out by 50% when CPU exceeds 80% for 5 minutes
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU > 80 avg 5m" \
  --scale out 50 --type PercentChangeCount

# Scale in by 25% when CPU drops below 25% for 15 minutes
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU < 25 avg 15m" \
  --scale in 25 --type PercentChangeCount
```

### Multi-Step Scaling

You can create multiple scale-out rules at different thresholds for a stepped response:

```bash
# Moderate load: add 1 instance at 60% CPU
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU > 60 avg 10m" \
  --scale out 1

# High load: add 3 instances at 80% CPU
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU > 80 avg 5m" \
  --scale out 3

# Critical load: add 5 instances at 90% CPU
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU > 90 avg 2m" \
  --scale out 5
```

When multiple rules are triggered simultaneously, Azure uses the rule that results in the highest instance count. So if both the 60% and 80% rules fire, the 80% rule wins and adds 3 instances instead of 1.

## Configuring Cooldown Periods

The cooldown period prevents rapid successive scale actions. After a scale-out or scale-in event, the autoscale engine waits for the cooldown period before evaluating rules again.

```bash
# Set a 5-minute cooldown on a scale-out rule
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU > 70 avg 10m" \
  --scale out 1 \
  --cooldown 5

# Set a 10-minute cooldown on scale-in (longer to prevent premature scale-in)
az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --condition "Percentage CPU < 30 avg 10m" \
  --scale in 1 \
  --cooldown 10
```

I recommend asymmetric cooldowns - shorter for scale-out (you want to respond to load quickly) and longer for scale-in (you want to make sure the load has truly subsided).

## Using ARM Templates for Autoscale

For production deployments, define autoscale rules in an ARM template:

```json
{
  "type": "Microsoft.Insights/autoscaleSettings",
  "apiVersion": "2022-10-01",
  "name": "cpu-autoscale",
  "location": "eastus",
  "properties": {
    "enabled": true,
    "targetResourceUri": "[resourceId('Microsoft.Compute/virtualMachineScaleSets', 'myScaleSet')]",
    "profiles": [
      {
        "name": "default-profile",
        "capacity": {
          "minimum": "2",
          "maximum": "10",
          "default": "3"
        },
        "rules": [
          {
            "metricTrigger": {
              "metricName": "Percentage CPU",
              "metricResourceUri": "[resourceId('Microsoft.Compute/virtualMachineScaleSets', 'myScaleSet')]",
              "timeGrain": "PT1M",
              "statistic": "Average",
              "timeWindow": "PT10M",
              "timeAggregation": "Average",
              "operator": "GreaterThan",
              "threshold": 70
            },
            "scaleAction": {
              "direction": "Increase",
              "type": "ChangeCount",
              "value": "1",
              "cooldown": "PT5M"
            }
          },
          {
            "metricTrigger": {
              "metricName": "Percentage CPU",
              "metricResourceUri": "[resourceId('Microsoft.Compute/virtualMachineScaleSets', 'myScaleSet')]",
              "timeGrain": "PT1M",
              "statistic": "Average",
              "timeWindow": "PT10M",
              "timeAggregation": "Average",
              "operator": "LessThan",
              "threshold": 30
            },
            "scaleAction": {
              "direction": "Decrease",
              "type": "ChangeCount",
              "value": "1",
              "cooldown": "PT10M"
            }
          }
        ]
      }
    ]
  }
}
```

## Schedule-Based Profiles

If your traffic has predictable patterns (for example, high during business hours, low at night), combine time-based profiles with metric-based rules:

```bash
# Create a daytime profile with higher minimum instances
az monitor autoscale profile create \
  --resource-group myResourceGroup \
  --autoscale-name cpu-autoscale \
  --name "business-hours" \
  --min-count 5 \
  --max-count 20 \
  --count 5 \
  --recurrence week Mon Tue Wed Thu Fri \
  --start "08:00" \
  --end "20:00" \
  --timezone "Eastern Standard Time"
```

The schedule ensures you have enough instances before the traffic hits, and the CPU-based rules handle unexpected spikes on top of that.

## Monitoring Autoscale Behavior

After setting up autoscale, you need to verify it works as expected. Check the autoscale activity log:

```bash
# View autoscale events
az monitor autoscale show \
  --resource-group myResourceGroup \
  --name cpu-autoscale \
  --query "{Enabled:enabled, MinCount:profiles[0].capacity.minimum, MaxCount:profiles[0].capacity.maximum, RuleCount:profiles[0].rules | length(@)}" \
  -o table

# Check the autoscale activity log for recent scale actions
az monitor activity-log list \
  --resource-group myResourceGroup \
  --offset 24h \
  --query "[?operationName.value=='Microsoft.Insights/AutoscaleSettings/Scaleup/Action' || operationName.value=='Microsoft.Insights/AutoscaleSettings/Scaledown/Action'].{Time:eventTimestamp, Action:operationName.localizedValue, Status:status.localizedValue}" \
  -o table
```

Set up alerts for autoscale events so you know when scaling happens:

```bash
# Create an alert for scale events
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "autoscale-event-alert" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/myScaleSet" \
  --condition "avg Percentage CPU > 90" \
  --description "CPU is critically high despite autoscale"
```

## Common Tuning Mistakes

**Using Max instead of Average aggregation**: Max CPU will trigger scale-out when any single instance hits the threshold. Average is usually more appropriate because it reflects the overall load across the set.

**Too short evaluation windows**: A 1-minute evaluation window reacts to momentary CPU spikes (like a garbage collection pause). Use at least 5-10 minutes to avoid scaling on noise.

**Forgetting to scale in**: I have seen scale sets that only have scale-out rules. They grow during traffic spikes but never shrink. Always pair scale-out rules with scale-in rules.

**Setting minimum too low**: A minimum of 1 instance means a single failure takes your service offline. Set the minimum to at least 2 for production workloads.

Connect your autoscale-enabled scale set to OneUptime to correlate scaling events with application performance metrics. When you see response times spike followed by a scale-out event, you can measure how quickly the system recovered and whether your autoscale configuration is fast enough.

## Wrapping Up

CPU-based autoscaling is the foundation of elastic infrastructure on Azure. Start with the 70/30 thresholds, asymmetric cooldowns, and at least 10-minute evaluation windows. Monitor the autoscale behavior closely for the first few weeks and tune based on what you observe. Add schedule-based profiles for predictable traffic patterns and consider multi-step scaling rules for bursty workloads. The goal is a system that scales smoothly without human intervention and without overspending on idle instances.
