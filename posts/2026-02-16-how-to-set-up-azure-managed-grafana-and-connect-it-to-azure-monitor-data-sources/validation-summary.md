# Validation Summary: How to Set Up Azure Managed Grafana and Connect It to Azure Monitor Data Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Grafana
- Azure Monitor
- Log Analytics
- Azure Resource Graph
- Application Insights
- Azure Data Explorer
- Prometheus
- Azure CLI
- Bicep
- Azure Private Link
- Grafana dashboards and alerting

## Sources Consulted
- Microsoft Learn: Azure Managed Grafana overview - https://learn.microsoft.com/en-us/azure/managed-grafana/overview
- Microsoft Learn: Migrate from Azure Managed Grafana Essential service tier - https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-migrate-essential-service-tier
- Microsoft Learn: Azure CLI `az grafana` reference - https://learn.microsoft.com/en-gb/cli/azure/grafana?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az grafana data-source` reference - https://learn.microsoft.com/en-gb/cli/azure/grafana/data-source?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az grafana dashboard` reference - https://learn.microsoft.com/en-gb/cli/azure/grafana/dashboard?view=azure-cli-latest
- Microsoft Learn: Azure Managed Grafana ARM/Bicep resource reference - https://learn.microsoft.com/azure/templates/microsoft.dashboard/2023-09-01/grafana
- Microsoft Learn: Configure Azure Managed Grafana authentication and permissions - https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-authentication-permissions
- Microsoft Learn: Manage Log Analytics workspace access - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-access
- Microsoft Learn: Set up private access in Azure Managed Grafana - https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-set-up-private-access
- Microsoft Learn: Add an Azure Data Explorer data source in Grafana - https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-connect-azure-data-explorer
- Grafana documentation: Azure Monitor data source - https://grafana.com/docs/grafana/latest/datasources/azuremonitor/

## Issues Found
- The post referred to Azure Active Directory. Updated those references to Microsoft Entra ID, the current Microsoft product name.
- The post recommended the Essential tier for development and testing. Current Microsoft documentation says Essential preview is being replaced and new Essential workspaces are disabled, so the text now recommends Standard for new workspaces.
- The Azure CLI creation example described zone redundancy but did not enable it. Added `--zone-redundancy "Enabled"` to match the surrounding guidance.
- The Log Analytics role assignment example assigned `Log Analytics Reader` at subscription scope. Updated the example to show a Log Analytics workspace scope, which better matches the role's purpose and least-privilege guidance.
- The Azure Monitor data source section said there were three query types. Current Grafana documentation lists Metrics, Logs, Traces, and Azure Resource Graph, so Application Insights Traces was added and the count was corrected.

## Review Notes
- The local environment did not have Azure CLI installed, so CLI validation used the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
- The Bicep resource type and properties in the post match the documented `Microsoft.Dashboard/grafana@2023-09-01` schema.
- The private endpoint example uses the documented `grafana` group ID for inbound private access to Azure Managed Grafana.
