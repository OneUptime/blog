# Validation Summary: How to Write Azure Resource Graph Queries to Inventory All Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Graph
- Kusto Query Language (KQL)
- Azure CLI
- Azure PowerShell
- Azure Automation
- Azure Resource Manager resources

## Sources Consulted
- Azure Resource Graph overview: https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview
- Azure Resource Graph table and resource type reference: https://learn.microsoft.com/azure/governance/resource-graph/reference/supported-tables-resources
- Azure Resource Graph query language: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/query-language
- Azure Resource Graph large data set guidance: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/work-with-data
- Azure Resource Graph pagination guidance: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/paging-results
- Azure CLI `az graph query` reference: https://learn.microsoft.com/en-us/cli/azure/graph
- Azure PowerShell `Search-AzGraph` reference: https://learn.microsoft.com/en-us/powershell/module/az.resourcegraph/search-azgraph
- Azure Resource Graph VM sample queries: https://learn.microsoft.com/en-us/azure/virtual-machines/resource-graph-samples
- Azure Resource Graph Resource Manager tag samples: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-graph-samples
- Kusto `join` operator reference: https://learn.microsoft.com/en-us/kusto/query/join-operator

## Issues Found
- The post described Resource Graph as querying all tenant resources without qualification. Updated the wording to clarify that Azure CLI and Azure PowerShell query resources in accessible subscriptions and still require appropriate read permissions.
- The VM inventory query said it included power state but did not project it. Added `properties.extended.instanceView.powerState.code`, matching Microsoft Resource Graph VM samples.
- The storage account query labeled `properties.primaryEndpoints` as replication. Changed replication to `sku.name`, which is where storage account redundancy such as `Standard_LRS` is represented in Resource Graph results.
- The NSG rules query claimed to list all NSG rules but only expanded `properties.securityRules`. Updated the comment to say custom NSG rules.
- The missing-tag query compared a dynamic value directly to an empty string. Changed it to `isempty(tostring(tags['Environment']))`.
- The no-tags query compared the dynamic `tags` bag to the string `"{}"`. Changed it to check `isnull(tags)` or `array_length(bag_keys(tags)) == 0`.
- The resource group join used `on $left.id startswith $right.rgId`, but KQL join conditions are equality-based. Changed the query to build a normalized resource group ID and join on equality.
- The resource group `resourcecontainers` type was incorrect. Changed it to `microsoft.resources/subscriptions/resourcegroups`.
- The export example used `--first 5000`, but `az graph query --first` accepts 1-1000. Changed it to `--first 1000`.
- The export text said CSV while the command used `--output tsv` and wrote a `.tsv` file. Updated the wording to TSV.
- The Azure Automation runbook snippet did not establish an Azure context. Added `Connect-AzAccount -Identity` for managed identity authentication.

## Review Notes
Azure CLI was not installed in the local environment, so CLI behavior was verified against Microsoft Learn rather than local `az --help`. The pagination example uses `--skip` with an ordered query, which is supported, though skip tokens may be preferable for some API-driven workflows.
