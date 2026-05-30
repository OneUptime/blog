# Validation Summary: How to Use Azure Portal Resource Graph Explorer to Query Resources at Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Graph
- Azure Resource Graph Explorer
- Kusto Query Language (KQL)
- Azure CLI
- Azure PowerShell
- Azure Policy compliance data
- Azure Resource Manager resources

## Sources Consulted
- Azure Resource Graph overview: https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview
- Azure Resource Graph query language: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/query-language
- Azure Resource Graph table and resource type reference: https://learn.microsoft.com/azure/governance/resource-graph/reference/supported-tables-resources
- Azure CLI `az graph query` reference: https://learn.microsoft.com/en-us/cli/azure/graph
- Azure PowerShell `Search-AzGraph` reference: https://learn.microsoft.com/en-us/powershell/module/az.resourcegraph/search-azgraph
- Working with large Azure resource data sets: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/work-with-data
- Azure Resource Graph pagination guidance: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/paging-results
- Azure Resource Graph shared query tutorial: https://learn.microsoft.com/en-us/azure/governance/resource-graph/tutorials/create-share-query
- Azure Resource Graph troubleshooting: https://learn.microsoft.com/en-us/azure/governance/resource-graph/troubleshoot/general
- Azure networking Resource Graph samples: https://learn.microsoft.com/en-us/azure/networking/resource-graph-samples

## Issues Found
- The introductory capabilities overstated scale by saying results come back in seconds regardless of resource count. Updated the wording to say Resource Graph returns results quickly across large environments and to mention scope limits.
- The public IP query returned Public IP Address resources even when `properties.ipAddress` was empty. Added `where isnotempty(properties.ipAddress)` to match the stated goal of finding resources with public IP addresses.
- The pagination section referred generically to `$top` and `$skip` while the examples used Azure CLI. Clarified that `$top` and `$skip` are REST API options, while Azure CLI uses `--first` and `--skip`.
- The pagination examples did not sort results. Added `order by id asc` and projected `id`, because Microsoft recommends sorting for repeatable paging.
- The data freshness limitation said resource changes may take up to five minutes to appear. Adjusted this to reflect Microsoft documentation: change records are normally available in less than five minutes, while some fields can update more slowly.
- The limitations section said the maximum query result size was 5 MB. Updated it to the current documented 16 MB response size guidance and recommended paging or partitioning.

## Review Notes
The remaining KQL examples use supported Resource Graph tables, operators, and Azure resource type names. The Azure CLI and PowerShell examples use current documented commands and parameters.
