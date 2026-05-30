# Validation Summary: How to Use Parameters and Dynamic Content in Azure Workbooks for Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Workbooks
- Azure Monitor
- Log Analytics
- Kusto Query Language (KQL)
- Azure Resource Graph

## Sources Consulted
- Microsoft Learn: Workbook parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-parameters
- Microsoft Learn: Workbook dropdown parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-dropdowns
- Microsoft Learn: Workbook time parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-time
- Microsoft Learn: Workbook multi-value parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-multi-value
- Microsoft Learn: Workbook resource parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-resources
- Microsoft Learn: Options group parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-options-group
- Microsoft Learn: Azure Workbooks link actions - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-link-actions
- Microsoft Learn: Azure Resource Graph advanced query samples - https://learn.microsoft.com/en-us/azure/governance/resource-graph/samples/advanced
- Microsoft Learn: Azure Resource Graph sample queries for Azure Resource Manager - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-graph-samples

## Issues Found
- The post claimed it covered every parameter type and listed `Resource group picker` as a parameter type. Current Microsoft documentation lists Time, Drop down, Options group, Text, Criteria, Resource, Subscription, Multi-value, Resource type, and Location. I updated the overview and changed the resource group example to a query-backed dropdown using Azure Resource Graph.
- The Azure Resource Graph examples used lowercase table names and exact-case resource type comparisons. I updated the examples to use the documented `ResourceContainers` and `Resources` table names and case-insensitive `=~` comparisons.
- The resource group and VM dropdown examples projected only `name`. I changed them to project `value` and `label`, matching the documented dropdown parameter column behavior.
- The default-value query returned only `Computer`. I changed it to return `value`, `label`, and `selected = true`, which matches the documented dropdown default-selection pattern.
- The "JSON-Formatted Parameters" section described JSON data, but the example showed value and label columns. I renamed the section and description to accurately describe value/label columns.
- The tab example used a dropdown with "radio button style." I changed it to an options group parameter, which is the documented workbook parameter type for selecting one value from a known set.
- The performance section referenced "Cache duration" and "Run query when" settings that I could not verify in current official documentation. I replaced those specific UI claims with a scoped-query recommendation.

## Review Notes
The KQL examples are illustrative and depend on the presence of the referenced tables, such as `Heartbeat`, `Event`, and `AppRequests`, in the selected Log Analytics workspace or Application Insights resource. The workbook parameter syntax and multi-select formatting align with current Microsoft Learn documentation.
