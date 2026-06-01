# Validation Summary: How to Audit and Revoke Azure Lighthouse Delegations for Security Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Lighthouse
- Azure Managed Services registration definitions and assignments
- Azure CLI
- Azure PowerShell Az.ManagedServices
- Azure Resource Graph
- Azure Monitor Activity Log alerts and action groups
- Azure REST API for Managed Services
- Microsoft Entra Privileged Identity Management

## Sources Consulted
- Azure CLI `az managedservices assignment` documentation: https://learn.microsoft.com/en-us/cli/azure/managedservices/assignment
- Azure CLI `az managedservices definition` documentation: https://learn.microsoft.com/en-us/cli/azure/managedservices/definition
- Azure CLI `az monitor action-group` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Azure CLI `az monitor activity-log alert` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert
- Azure PowerShell `Get-AzManagedServicesAssignment` documentation: https://learn.microsoft.com/en-us/powershell/module/az.managedservices/get-azmanagedservicesassignment
- Azure PowerShell `Get-AzManagedServicesDefinition` documentation: https://learn.microsoft.com/en-us/powershell/module/az.managedservices/get-azmanagedservicesdefinition
- Azure PowerShell `Remove-AzManagedServicesAssignment` documentation: https://learn.microsoft.com/en-us/powershell/module/az.managedservices/remove-azmanagedservicesassignment
- Azure Lighthouse remove delegation documentation: https://learn.microsoft.com/en-us/azure/lighthouse/how-to/remove-delegation
- Azure Lighthouse eligible authorizations documentation: https://learn.microsoft.com/en-us/azure/lighthouse/how-to/create-eligible-authorizations
- Azure Resource Graph supported tables and resource types: https://learn.microsoft.com/en-us/azure/governance/resource-graph/reference/supported-tables-resources
- Azure Managed Services Registration Assignments REST API documentation: https://learn.microsoft.com/en-us/rest/api/managedservices/registration-assignments/list

## Issues Found
- The PowerShell examples used `$assignment.Properties.RegistrationDefinitionId`, `$def.Properties.ManagedByTenantId`, `$def.Properties.RegistrationDefinitionName`, and `$def.Properties.Authorizations`. Current Az.ManagedServices cmdlets expose these values as top-level properties such as `RegistrationDefinitionId`, `ManagedByTenantId`, `Name`, and `Authorization`, so the scripts were updated accordingly.
- The Azure Resource Graph query used the incorrect `servicehealthresources` table and assumed expanded registration definition properties on assignment resources. It was changed to query `managedserviceresources` and join registration assignments to registration definitions.
- The REST API example used the old `2020-02-01-preview` API version. It was updated to the current documented `2022-10-01` API version and kept `$expandRegistrationDefinition=true`.
- The action group creation command used `--email-receiver name=... email-address=...`, which does not match the current Azure CLI syntax. It was changed to `--action email SecurityTeam security@contoso.com`.
- The PowerShell revocation example used `Remove-AzManagedServicesAssignment -Id`, but the documented cmdlet parameters are `-Name` with `-Scope` or `-InputObject`. It was changed to remove by assignment name and subscription scope.

## Review Notes
The Azure CLI examples could not be executed locally because `az` is not installed in this environment, so they were verified against current Microsoft Learn CLI reference documentation. The remaining guidance is technically sound, including the need for the Managed Services Registration Assignment Delete Role for managing-tenant-side removal and the recommendation to use PIM-integrated eligible authorizations for sensitive access.
