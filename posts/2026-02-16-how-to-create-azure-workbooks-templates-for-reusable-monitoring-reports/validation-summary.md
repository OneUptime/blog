# Validation Summary: How to Create Azure Workbooks Templates for Reusable Monitoring Reports

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Workbooks
- Azure Monitor
- KQL / Kusto Query Language
- Azure CLI
- ARM templates
- Terraform AzureRM provider
- Application Insights
- VM insights

## Sources Consulted
- Microsoft Learn: Create or edit an Azure Workbook - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-create-workbook
- Microsoft Learn: Workbook parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-parameters
- Microsoft Learn: Workbook resource parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-resources
- Microsoft Learn: Workbook time parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-time
- Microsoft Learn: Manage Azure Monitor Workbooks - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-manage
- Microsoft Learn: Azure Workbooks templates - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-templates
- Microsoft Learn: Microsoft.Insights/workbooktemplates ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/workbooktemplates
- Microsoft Learn: Microsoft.Insights/workbooks ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/workbooks
- Microsoft Learn: Azure CLI az monitor app-insights workbook reference - https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/workbook
- Terraform Registry: azurerm_application_insights_workbook - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights_workbook
- Terraform Registry: azurerm_application_insights_workbook_template - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights_workbook_template
- Microsoft Learn: VM Insights Map and Dependency Agent retirement guidance - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vminsights-maps-retirement
- Microsoft Learn: Azure Service Map lifecycle - https://learn.microsoft.com/en-us/lifecycle/products/azure-service-map
- Microsoft Learn: Kusto in operator - https://learn.microsoft.com/en-us/kusto/query/in-cs-operator
- Microsoft Learn: Kusto user-defined functions - https://learn.microsoft.com/en-us/kusto/query/functions/user-defined-functions
- Microsoft Learn: Kusto top operator - https://learn.microsoft.com/en-us/kusto/query/top-operator

## Issues Found
- The multi-tab layout instructions said to set a Group step style to "Tabs". Official Azure Workbooks guidance uses a Links/Tabs item styled as tabs, with tab selections setting a parameter and groups conditionally visible for each tab's content. Updated the instructions accordingly.
- The Azure CLI export example used `az monitor workbook show`, which is not the documented workbook command. Updated it to `az monitor app-insights workbook show`, added `--can-fetch-content true`, and used the documented UUID workbook resource name requirement.
- The ARM workbook template gallery category used "Infrastructure". Microsoft examples use `workbook` for workbook gallery category, so the snippet now uses `workbook`.
- The post described "Workbook functions" as reusable across steps. The example is a KQL query-defined function scoped to an individual query, so the wording now says it is reusable within a query step.
- The incident example referenced Service Map dependency maps. Azure Service Map retired on September 30, 2025, and VM insights Map / Dependency Agent are deprecated. Updated the bullet to refer to VM insights dependency data only where still collected, with the retirement caveat.
- The Terraform workbook example used a human-readable name. The AzureRM resource requires the workbook `name` to be a UUID/GUID, and common workbook category values include `workbook`; updated both fields.

## Review Notes
The remaining KQL examples use valid Workbook time parameter expansion and standard Kusto syntax, but they assume the relevant Azure Monitor tables and VM insights metrics are present in the selected workspace. Empty results or missing telemetry are operational data issues rather than syntax errors.
