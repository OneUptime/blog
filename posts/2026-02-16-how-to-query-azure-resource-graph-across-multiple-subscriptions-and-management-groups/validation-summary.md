# Validation Summary: How to Query Azure Resource Graph Across Multiple Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Graph
- Azure CLI
- Azure PowerShell / Az.ResourceGraph
- Azure Resource Manager REST API
- Kusto Query Language (KQL)
- Azure management groups and subscriptions

## Sources Consulted
- Azure CLI `az graph` reference: https://learn.microsoft.com/en-us/cli/azure/graph?view=azure-cli-latest
- Azure PowerShell `Search-AzGraph` reference: https://learn.microsoft.com/en-us/powershell/module/az.resourcegraph/search-azgraph
- Azure Resource Graph REST API quickstart: https://learn.microsoft.com/en-us/azure/governance/resource-graph/first-query-rest-api
- Azure Resource Graph query language and query scope: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/query-language
- Azure Resource Graph pagination guidance: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/paging-results
- Working with large Azure Resource Graph data sets: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/work-with-data
- Azure Resource Graph throttling guidance: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/guidance-for-throttled-requests
- Azure management groups overview: https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Elevate access for Global Administrators: https://learn.microsoft.com/en-us/azure/role-based-access-control/elevate-access-global-admin

## Issues Found
- Management group scope caveat was incomplete. Resource Graph management group queries include subscriptions under the hierarchy, but official query scope documentation notes that only the first 10,000 subscriptions are included when a management group scope exceeds that number. Added this caveat.
- Pagination examples used a non-unique sort order and the PowerShell example used offset pagination only. Official pagination guidance recommends ordering paged results by at least one stable column, and `Search-AzGraph` supports `-SkipToken`; its documentation notes that keeping `id` in the result is required to get a skip token. Updated the examples to project `id`, order by `id asc`, and use `SkipToken` in PowerShell.
- Throttling limits were described as fixed and different for CLI and REST API. Official guidance describes per-user quotas, gives 15 queries per 5-second window as an example, and states quota values can change. Reworded the claim accordingly.
- Result-set wording said the maximum result set per query is 1000 rows. Official guidance frames this as the maximum returned records in a single response. Updated wording to avoid implying the full logical result set is limited to 1000 rows.

## Review Notes
- The Azure CLI, PowerShell, and REST API parameters shown in the post match current official documentation.
- The REST API example uses `api-version=2022-10-01`, which is still used in Microsoft’s current Resource Graph REST quickstart. Newer REST reference versions exist, but the example is not technically incorrect.
- Local verification with `az graph query --help` and `Search-AzGraph` was not possible because Azure CLI and PowerShell are not installed in this environment.
