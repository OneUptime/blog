# Validation Summary: How to Manage Custom Roles in Azure RBAC Using the Azure Portal and PowerShell

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure RBAC
- Azure custom roles
- Azure Portal
- Azure PowerShell Az.Resources
- Azure SQL Database
- Dynamic Data Masking

## Sources Consulted
- Microsoft Learn: Azure custom roles - Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Microsoft Learn: New-AzRoleDefinition (Az.Resources): https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azroledefinition
- Microsoft Learn: Get-AzProviderOperation (Az.Resources): https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azprovideroperation
- Microsoft Learn: Azure built-in roles for Compute - Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/compute
- Microsoft Learn: Azure permissions for Monitor - Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/monitor
- Microsoft Learn: Azure permissions for Databases - Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/databases
- Microsoft Learn: Dynamic data masking: https://learn.microsoft.com/en-us/sql/relational-databases/security/dynamic-data-masking

## Issues Found
- The VM Operator PowerShell example used `Microsoft.Insights/alertRules/*` under a comment that said it only allowed viewing metrics and diagnostics. The wildcard permission can create and manage classic metric alerts, so it was changed to `Microsoft.Insights/alertRules/read`.
- The Azure SQL example incorrectly claimed an Azure RBAC custom role could execute database queries while preventing access to unmasked PII with `NotActions`. Azure RBAC controls management-plane permissions, while SQL query access and `UNMASK` are database permissions managed with T-SQL. The example was corrected to a SQL metadata reader role and now uses read-only Azure SQL metadata and data masking policy actions.

## Review Notes
- `NotActions` and `NotDataActions` are exclusions from a role's allowed action set, not deny rules. A user can still receive an excluded permission through another role assignment.
- The custom role limit and assignable scope limitations were consistent with current Azure RBAC documentation as of 2026-06-01.
