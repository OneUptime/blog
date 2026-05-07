# Validation Summary: How to Create Azure Log Analytics Workspaces with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Azure Resource Manager (`azurerm` provider)
- Azure Log Analytics Workspaces
- Azure Monitor diagnostic settings
- Azure Kubernetes Service (AKS)
- Container Insights
- Microsoft Defender for Cloud
- Kusto Query Language (KQL)

## Sources Consulted
- HashiCorp AzureRM provider v3.85.0 docs for `azurerm_log_analytics_workspace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/r/log_analytics_workspace.html.markdown
- HashiCorp AzureRM provider v3.85.0 docs for `azurerm_monitor_diagnostic_setting`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/r/monitor_diagnostic_setting.html.markdown
- HashiCorp AzureRM provider v3.85.0 docs for `azurerm_log_analytics_solution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/r/log_analytics_solution.html.markdown
- HashiCorp AzureRM provider v3.85.0 docs for `azurerm_kubernetes_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.85.0/website/docs/r/kubernetes_cluster.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_log_analytics_saved_search`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_saved_search
- Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Log Analytics workspace overview: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-workspace-overview
- Azure Monitor Logs cost calculations and options: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cost-logs
- Enable monitoring for AKS clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Legacy authentication for Container Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-authentication
- Azure Monitor Logs reference for `AppRequests`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apprequests
- Azure App Service monitoring data reference: https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service-reference
- Azure Key Vault logging and monitoring references: https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging and https://learn.microsoft.com/en-us/azure/key-vault/general/monitor-key-vault-reference
- Azure CLI `az monitor log-analytics solution`: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/solution
- ARM/Bicep reference for `Microsoft.OperationsManagement/solutions`: https://learn.microsoft.com/en-us/azure/templates/microsoft.operationsmanagement/solutions

## Issues Found
- The saved query compared `AppRequests.ResultCode` directly to `500`, but Microsoft documents `ResultCode` as a string column. I changed the query to `toint(ResultCode) >= 500` so it works correctly in KQL.
- The AKS `oms_agent` example omitted managed-identity monitoring auth. Current Microsoft guidance for Container Insights uses managed identity authentication, and legacy authentication has been retired. I added `msi_auth_for_monitoring_enabled = true`.
- The Best Practices section referred to "Azure Defender", which is outdated branding. I updated the guidance to refer to Microsoft Defender for Cloud and framed it in terms of workspace usage and ingestion benefits.
- The Best Practices section said you need Azure Storage for retention beyond 730 days. Current Microsoft documentation supports long-term retention in the workspace for up to 12 years, so I updated the recommendation accordingly.
- The App Service diagnostics comment said it enabled "all log categories", but the snippet only enabled selected categories. I corrected the comment.
- The solutions section wording implied a stronger requirement than the platform docs support. I adjusted the wording to make the Log Analytics solutions examples explicitly optional and to use the actual solution names shown in code.

## Review Notes
- The post pins `hashicorp/azurerm` to `~> 3.85`. That is older than the current latest major provider line, but the examples were validated against the v3.85.0 provider documentation and remain technically coherent for that version.
- Microsoft’s current AKS monitoring documentation for Terraform also discusses DCR/DCRA resources when fully managing Container Insights onboarding. The post’s AKS snippet is acceptable as a minimal workspace-linking example after the managed-identity fix, but a production walkthrough would likely need to cover those resources too.
