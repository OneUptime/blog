# Validation Summary: How to Manage Role-Based Access Control Across Azure Management Groups

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure role-based access control (Azure RBAC)
- Azure management groups
- Azure CLI
- Azure Resource Manager templates
- Microsoft Entra ID groups
- Microsoft Entra Privileged Identity Management
- Azure custom roles

## Sources Consulted
- Azure role assignment steps: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps
- Azure CLI `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure CLI `az ad group`: https://learn.microsoft.com/en-us/cli/azure/ad/group?view=azure-cli-latest
- Azure CLI `az ad group member`: https://learn.microsoft.com/en-us/cli/azure/ad/group/member?view=azure-cli-latest
- Azure custom roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Azure CLI custom role creation: https://learn.microsoft.com/en-us/azure/role-based-access-control/tutorial-custom-role-cli
- ARM template `Microsoft.Authorization/roleAssignments`: https://learn.microsoft.com/en-us/azure/templates/microsoft.authorization/roleassignments
- Azure deny assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments
- Eligible and time-bound role assignments in Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/pim-integration
- Azure built-in management and governance roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/management-and-governance
- Azure built-in security roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security

## Issues Found
- The deny-assignment explanation incorrectly tied deny assignments to Azure Blueprints and PIM configurations. Updated it to match current documentation: deny assignments are created and managed by Azure, including through deployment stack deny settings.
- The overlapping-assignment rule said "the most permissive role wins." Reworded it to describe Azure RBAC effective access more accurately as the union of allowed actions, subject to applicable Azure-managed deny assignments.
- The Security Reader recommendation described read-only visibility "across everything." Updated it to read-only visibility into security posture and recommendations, which better matches the built-in role.
- The ARM template parameter metadata suggested `roleDefinitionId` could be `Reader` or `Contributor`. Corrected it to require a role definition GUID, because the template uses `tenantResourceId('Microsoft.Authorization/roleDefinitions', ...)`.
- The group section used the outdated Azure AD name. Updated the section and related text to Microsoft Entra groups / Microsoft Entra ID while preserving the existing Azure CLI commands.
- The user audit command said it checked access across all management groups. Corrected the comment because `az role assignment list --all` is scoped to the current subscription context unless additional scopes are queried.
- The access review note used the outdated Azure AD Access Reviews name. Updated it to Microsoft Entra access reviews.

## Review Notes
The Azure CLI commands and custom role example are structurally valid against current Azure CLI documentation. The ARM role assignment example is valid when the caller supplies a built-in or custom role definition GUID and deploys at management group scope with sufficient permissions.
