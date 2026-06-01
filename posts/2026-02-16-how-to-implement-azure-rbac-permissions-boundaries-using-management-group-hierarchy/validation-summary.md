# Validation Summary: How to Use Azure RBAC Permissions Boundaries Using Management Group Hierarchy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure management groups
- Azure RBAC
- Azure role assignment conditions / Azure ABAC
- Azure Policy
- Azure CLI
- Azure Monitor Logs / KQL

## Sources Consulted
- Microsoft Learn: Quickstart: Create a management group with the Azure CLI - https://learn.microsoft.com/en-us/azure/governance/management-groups/create-management-group-azure-cli
- Microsoft Learn: Organize your resources with management groups - https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Microsoft Learn: az account management-group subscription - https://learn.microsoft.com/en-us/cli/azure/account/management-group/subscription
- Microsoft Learn: az role assignment - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Delegate Azure role assignment management to others with conditions - https://learn.microsoft.com/en-us/azure/role-based-access-control/delegate-role-assignments-portal
- Microsoft Learn: Examples to delegate Azure role assignment management with conditions - https://learn.microsoft.com/en-us/azure/role-based-access-control/delegate-role-assignments-examples
- Microsoft Learn: What is Azure attribute-based access control (Azure ABAC)? - https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview
- Microsoft Learn: Azure custom roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Microsoft Learn: az policy assignment - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Tutorial: Disallow resource types in your cloud environment - https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/disallowed-resources
- Microsoft Learn: AzureActivity table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azureactivity

## Issues Found
- The introduction mentioned deny assignments, but the post did not show Azure deny assignments and instead used role assignment conditions and Azure Policy. Updated the wording to match the implementation.
- The post described role assignment conditions as preview. Microsoft documentation lists adding conditions with Azure CLI as GA, so the preview label was removed.
- The conditional delegation example only constrained role assignment creation. Microsoft examples for delegation also constrain role assignment deletion because the attribute source differs for write and delete actions. Added the delete condition and updated the explanatory text.
- The public IP denial policy assignment used the built-in "Not allowed resource types" policy definition but omitted its required `listOfResourceTypesNotAllowed` parameter. Added `Microsoft.Network/publicIPAddresses` as the denied resource type.
- The KQL audit query claimed to find management-group-scoped role assignments but did not filter to management group scopes. Updated it to use `Authorization_d.scope` and filter scopes starting with `/providers/Microsoft.Management/managementGroups/`.
- The post said Azure Resource Graph was used to list role assignments, but the example used `az role assignment list`. Updated the text to say Azure CLI.

## Review Notes
The Azure CLI was not installed in the local workspace, so command syntax was validated against current Microsoft Learn CLI reference pages rather than local `az --help` output.
