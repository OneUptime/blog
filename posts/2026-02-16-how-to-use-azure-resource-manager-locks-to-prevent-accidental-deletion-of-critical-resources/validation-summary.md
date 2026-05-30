# Validation Summary: How to Use Azure Resource Manager Locks to Prevent Accidental Deletion of

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Manager locks
- Azure CLI
- Azure PowerShell
- Bicep
- Azure Policy
- Bash scripting

## Sources Consulted
- Microsoft Learn: Lock your Azure resources to protect your infrastructure - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- Microsoft Learn: az lock CLI reference - https://learn.microsoft.com/en-us/cli/azure/lock
- Microsoft Learn: New-AzResourceLock PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresourcelock
- Microsoft Learn: Microsoft.Authorization/locks Bicep and ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/locks
- Microsoft Learn: Azure Policy deployIfNotExists effect - https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: Azure built-in roles for Security, Locks Contributor - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security

## Issues Found
- The Azure CLI and PowerShell examples used `Microsoft.Sql/servers` but described the target as a SQL database. Updated the comments and lock notes to describe the target as a production SQL server, matching the resource type used.
- The Azure Policy `deployIfNotExists` example was incomplete. Added the required `roleDefinitionIds` and `deployment` properties, used the SQL server lock extension resource type, and included the Locks Contributor role so the remediation identity can create management locks.

## Review Notes
- The local Azure CLI was not installed in the review environment, so CLI validation was performed against the official Microsoft Learn CLI reference.
- The post correctly notes that locks apply through Azure Resource Manager management operations and that ReadOnly locks can block POST-based management operations such as listing storage account keys.
