# Validation Summary: How to Configure Autoscale Rules for Azure VM Scale Sets Based on CPU Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor Autoscale
- Azure Virtual Machine Scale Sets
- Azure CLI
- ARM templates
- Azure Monitor metric alerts
- Azure Activity Log

## Sources Consulted
- Microsoft Learn: az monitor autoscale CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale?view=azure-cli-latest
- Microsoft Learn: az monitor autoscale rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule?view=azure-cli-latest
- Microsoft Learn: az monitor autoscale profile CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/profile?view=azure-cli-latest
- Microsoft Learn: Understand autoscale settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-understanding-settings
- Microsoft Learn: Best practices for autoscale - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-best-practices
- Microsoft Learn: Autoscale flapping - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-flapping
- Microsoft Learn: Microsoft.Insights/autoscalesettings 2022-10-01 ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2022-10-01/autoscalesettings
- Microsoft Learn: Azure Activity Log event schema - https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log-schema
- Microsoft Learn: az monitor metrics alert CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest

## Issues Found
- Corrected the autoscale evaluation cadence from "by default, every minute" to "every 30 to 60 seconds, depending on the resource type" to match Azure Monitor autoscale documentation.
- Fixed the scale-in threshold explanation. It incorrectly said CPU should drop below the scale-in threshold after scale-out, which would cause scale-in; it now says CPU should stay above the scale-in threshold.
- Corrected percentage-based Azure CLI scaling syntax from `--scale out 50 --type PercentChangeCount` and `--scale in 25 --type PercentChangeCount` to `--scale out 50%` and `--scale in 25%`, matching the current `az monitor autoscale rule create` syntax.
- Clarified cooldown behavior. Azure autoscale waits for cooldown before scaling again, not necessarily before the autoscale job evaluates rules again.
- Updated the ARM resource type casing to the documented `Microsoft.Insights/autoscalesettings`.
- Added `--copy-rules default` to the recurring profile example so the business-hours profile inherits the existing CPU rules; without it, the new profile would not necessarily have the metric-based rules described by the surrounding text.

## Review Notes
The high-CPU metric alert example is syntactically valid, but it alerts on sustained CPU pressure rather than directly on autoscale scale actions. For direct notifications on autoscale actions, Azure also supports activity log alerts or autoscale setting notifications.
