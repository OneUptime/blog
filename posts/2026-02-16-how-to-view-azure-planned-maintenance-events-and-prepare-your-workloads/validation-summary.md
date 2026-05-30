# Validation Summary: How to View Azure Planned Maintenance Events and Prepare Your Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Health
- Azure Resource Health
- Azure Monitor Activity Log and activity log alerts
- Azure CLI
- Azure Scheduled Events / Instance Metadata Service
- Azure Virtual Machines, availability zones, and availability sets
- Automatic VM guest patching
- Azure Maintenance Configurations

## Sources Consulted
- Microsoft Learn: Azure Resource Health Events - List By Subscription Id REST API: https://learn.microsoft.com/en-us/rest/api/resourcehealth/events/list-by-subscription-id?view=rest-resourcehealth-2025-05-01
- Microsoft Learn: Azure Service Health notifications data properties: https://learn.microsoft.com/en-us/azure/service-health/service-health-event-properties
- Microsoft Learn: Impacted resources from Azure planned maintenance events: https://learn.microsoft.com/en-us/azure/service-health/impacted-resources-planned-maintenance
- Microsoft Learn: Scheduled Events for Azure VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/scheduled-events
- Microsoft Learn: Maintenance for virtual machines in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/maintenance-and-updates
- Microsoft Learn: Azure availability zones overview: https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview
- Microsoft Learn: Automatic VM guest patching: https://learn.microsoft.com/en-us/azure/virtual-machines/automatic-vm-guest-patching
- Microsoft Learn: Managing VM updates with Maintenance Configurations: https://learn.microsoft.com/en-us/azure/virtual-machines/maintenance-configurations
- Microsoft Learn: Azure CLI `az maintenance configuration`: https://learn.microsoft.com/en-us/cli/azure/maintenance/configuration?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az maintenance assignment`: https://learn.microsoft.com/en-us/cli/azure/maintenance/assignment?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor activity-log`: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor activity-log alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest

## Issues Found
- The Service Health REST API example used `api-version=2022-10-01` with a server-side `$filter=eventType eq 'PlannedMaintenance'`. The current official REST API version is `2025-05-01`, and the response field is `properties.eventType`. Updated the example to call the current endpoint and filter planned maintenance events with the Azure CLI JMESPath query.
- The availability zone section said Azure maintenance "operates on one zone at a time" and implied guaranteed zero downtime. Microsoft documents that it aims to deploy updates within a single availability zone at a time. Updated the wording to avoid over-guaranteeing behavior and changed "zero downtime" to "minimal or no downtime."
- The automatic VM guest patching command for Windows set only `patchMode=AutomaticByPlatform`. Microsoft documents setting `osProfile.windowsConfiguration.enableAutomaticUpdates=true` along with `patchSettings.patchMode=AutomaticByPlatform` when updating a Windows VM. Added the missing setting.
- The Maintenance Configurations section described platform maintenance for regular VMs and used `--maintenance-scope Host` while assigning the configuration to a VM. Microsoft documents Host scope for isolated VMs, isolated VM scale sets, and dedicated hosts, while regular VMs use the guest scope for scheduled in-guest patching. Updated the text and example to use `InGuestPatch`, a two-hour window, `IfRequired` reboot setting, and `InGuestPatchMode=User`.

## Review Notes
- Azure CLI was not installed in the local environment, so command validation was performed against official Azure CLI documentation rather than local `az --help` output.
- The Scheduled Events script is conceptually correct for polling and acknowledging events from inside a VM, but production use should handle the first-call enablement delay, malformed/empty responses, multiple simultaneous events, and application-specific drain behavior.
