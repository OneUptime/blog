# Validation Summary: How to Set Up Azure Activity Log Exports with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / HCL
- Azure Activity Log
- Azure Monitor diagnostic settings
- Azure Log Analytics
- Azure Storage Accounts and lifecycle management
- Azure Event Hubs
- Azure Monitor activity log alerts
- AzureRM provider

## Sources Consulted
- AzureRM provider 4.0 upgrade guide https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- AzureRM provider documentation: `azurerm_monitor_diagnostic_setting` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/monitor_diagnostic_setting.html.markdown
- AzureRM provider documentation: `azurerm_eventhub` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/eventhub.html.markdown
- AzureRM provider documentation: `azurerm_eventhub_namespace_authorization_rule` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/eventhub_namespace_authorization_rule.html.markdown
- AzureRM provider documentation: `azurerm_monitor_activity_log_alert` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/monitor_activity_log_alert.html.markdown
- Microsoft Learn: Azure Monitor activity log https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log
- Microsoft Learn: Azure Activity Log event schema https://learn.microsoft.com/en-gb/azure/azure-monitor/platform/activity-log-schema
- Microsoft Learn: Diagnostic settings in Azure Monitor https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn: Migrate from diagnostic settings storage retention to Azure Storage lifecycle management https://learn.microsoft.com/en-au/azure/azure-monitor/platform/migrate-to-azure-storage-lifecycle-policy
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure

## Issues Found
- The introduction overstated Activity Log coverage as "all subscription-level events". I corrected it to subscription-level control plane events and added the documented 90-day default retention, because Activity Log does not cover all data-plane or read activity.
- The provider block pinned `azurerm` to `~> 3.0`, which is outdated for a 2026 post. I updated it to `~> 4.0` and added `subscription_id = var.subscription_id`, because AzureRM v4 requires the subscription ID to be specified.
- The Log Analytics example used outdated wording for the `Security` and `Policy` categories. I changed the comments from "Security Center alerts" to "Microsoft Defender for Cloud alerts" and from "Azure Policy evaluations" to "Azure Policy effect actions" to match current Azure terminology and Activity Log behavior.
- The storage example used `enabled_log.retention_policy` inside `azurerm_monitor_diagnostic_setting`. I removed those blocks and added `azurerm_storage_management_policy`, because AzureRM v4 removed diagnostic-setting retention policy support and Azure retired that retention feature in favor of Azure Storage lifecycle management.
- The Event Hub example used the older `azurerm_eventhub` shape with `namespace_name` and `resource_group_name`. I updated it to the current `namespace_id` form documented by the provider.
- The Event Hub export example used `azurerm_eventhub_authorization_rule`, but the diagnostic setting resource requires a namespace authorization rule ID. I changed it to `azurerm_eventhub_namespace_authorization_rule` and set `Manage`, `Send`, and `Listen` permissions, which Azure Monitor requires for Event Hubs streaming.
- The activity log alert examples omitted `location`, which is required in AzureRM v4. I added `location = "Global"` to both alert resources.
- The policy assignment alert description claimed it covered create, modify, and delete events, but the configured operation only matches `Microsoft.Authorization/policyAssignments/write`. I corrected the wording to create or modify so the text matches the actual alert behavior.
- The conclusion claimed a "complete audit trail of all subscription-level events". I revised it to a centralized audit trail of subscription-level control plane events so the closing summary matches Azure Activity Log semantics.

## Review Notes
- The post now targets current AzureRM v4 syntax while remaining valid OpenTofu HCL.
- The alert examples monitor `.../write` operations only. If delete notifications are also required, separate alert rules should be added for the corresponding `.../delete` operations.
