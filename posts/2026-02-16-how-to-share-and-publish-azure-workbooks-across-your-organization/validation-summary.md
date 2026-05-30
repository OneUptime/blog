# Validation Summary: How to Share and Publish Azure Workbooks Across Your Organization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Workbooks
- Azure Monitor
- Azure RBAC
- Azure CLI
- ARM templates
- Bicep
- PowerShell

## Sources Consulted
- Azure Workbooks overview and access control: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview
- Azure Workbooks templates: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-templates
- Azure Monitor workbooks resource schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2023-06-01/workbooks
- Azure Monitor workbook templates resource schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/workbooktemplates
- Azure CLI `az monitor app-insights workbook` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/workbook
- Azure built-in Monitor roles, including Workbook Reader and Workbook Contributor: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/monitor
- Microsoft Application-Insights-Workbooks repository: https://github.com/microsoft/Application-Insights-Workbooks

## Issues Found
- The Azure CLI examples used `az monitor workbook`, but the documented current command group is `az monitor app-insights workbook`. Updated the export and update commands.
- The CLI examples used arbitrary workbook resource names. The official CLI reference requires the workbook resource name to be a UUID, so the examples now use a UUID placeholder.
- The workbook export command did not request full workbook content. Added `--can-fetch-content true` so `properties.serializedData` is returned when exporting.
- The template-creation example implied `az monitor workbook create` could create `Microsoft.Insights/workbookTemplates`. Replaced it with an ARM deployment command because workbook templates are ARM resources of type `Microsoft.Insights/workbookTemplates`.
- Updated the workbook template resource type casing to `Microsoft.Insights/workbookTemplates`, matching the documented ARM resource type.
- The ARM template snippet used JSON comments inside a `json` code block, which made it invalid JSON. Removed the comments.
- The ARM and Bicep examples set workbook `properties.version` to `1.0`. The resource schema expects a workbook schema version such as `Notebook/1.0`, matching the serialized workbook data, so both examples now use `Notebook/1.0`.
- Updated ARM and Bicep resource examples to use `Microsoft.Insights/workbooks@2023-06-01`, the current documented stable schema version.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. The Azure CLI was not installed locally in the workspace, so CLI verification was performed against the official Microsoft Learn CLI reference rather than local `az --help` output.
