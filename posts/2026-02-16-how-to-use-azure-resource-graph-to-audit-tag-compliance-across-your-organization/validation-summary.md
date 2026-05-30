# Validation Summary: How to Use Azure Resource Graph to Audit Tag Compliance Across Your Organization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Graph
- Kusto Query Language (KQL)
- Azure CLI
- Azure PowerShell Az.ResourceGraph
- Azure Policy
- Azure resource tags
- Bash and jq

## Sources Consulted
- Azure Resource Graph overview: https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview
- Azure Resource Graph query language: https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/query-language
- Azure Resource Graph sample queries for tags: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-graph-samples
- Azure Resource Graph Explorer portal quickstart: https://learn.microsoft.com/en-us/azure/governance/resource-graph/first-query-portal
- Search-AzGraph PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/az.resourcegraph/search-azgraph
- Azure CLI az graph reference: https://learn.microsoft.com/en-us/cli/azure/graph
- Azure CLI az tag reference: https://learn.microsoft.com/en-us/cli/azure/tag
- Azure CLI az policy assignment reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Azure tag policy definitions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Azure Policy built-in definitions source repository: https://github.com/Azure/azure-policy/tree/master/built-in-policies/policyDefinitions/Tags

## Issues Found
- Several compliance queries used `isnotnull(tags['TagName'])`, which treats empty-string tag values as compliant. Updated the affected queries to use `isnotempty(tostring(...))` and corresponding `isempty(tostring(...))` checks where missing tags are reported.
- The dashboard query checked `tags == "{}"` to detect resources with no tags. Updated it to use `isempty(tags)`, matching Resource Graph's supported empty dynamic property checks.
- The historical tracking section said Resource Graph does not store historical compliance data. Updated the wording to state that Resource Graph queries current resource state and that historical tag compliance trends require snapshots, avoiding conflict with Resource Graph Change Analysis capabilities.
- The Bash remediation script projected only `id` and `resourceGroup`, then used a placeholder subscription in the resource group ID. Updated it to project `subscriptionId` and build the resource group resource ID from real query output.
- The Azure Policy example for "Require a tag on resources" used an incorrect built-in policy definition ID. Updated it to `/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b590-94f262ecfa99`.
- The Azure Policy example labeled "Inherit a tag from the resource group if missing" used the ID for "Inherit a tag from the resource group", which adds or replaces tag values. Updated it to `/providers/Microsoft.Authorization/policyDefinitions/ea3f2387-9b95-492a-a190-fcdc54f7b070`, the built-in definition that only adds the tag when missing.

## Review Notes
The examples are otherwise technically sound for current Azure Resource Graph, Azure CLI, and Az.ResourceGraph usage. In production, large estates may need explicit Resource Graph scoping and pagination controls such as `--subscriptions`, `--management-groups`, `--first`, or `-First` depending on the report shape.
