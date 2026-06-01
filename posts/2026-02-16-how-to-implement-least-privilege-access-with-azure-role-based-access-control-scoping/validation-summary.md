# Validation Summary: How to Use Least Privilege Access with Azure Role-Based Access Control Scoping

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Role-Based Access Control
- Azure CLI
- Azure custom roles
- Microsoft Entra ID groups
- Microsoft Entra Privileged Identity Management
- Microsoft Entra access reviews
- Microsoft Defender for Cloud CIEM
- Azure Activity Log
- Azure deployment stacks and deny assignments

## Sources Consulted
- Microsoft Learn: Steps to assign an Azure role - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps
- Microsoft Learn: Understand scope for Azure RBAC - https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview
- Microsoft Learn: Azure custom roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Microsoft Learn: Understand Azure role definitions - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions
- Microsoft Learn: List Azure role definitions - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions-list
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Azure CLI az role assignment - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure CLI az ad group - https://learn.microsoft.com/en-us/cli/azure/ad/group
- Microsoft Learn: Azure CLI az ad sp - https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn: Azure CLI az monitor activity-log - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- Microsoft Learn: Eligible and time-bound role assignments in Azure RBAC - https://learn.microsoft.com/en-us/azure/role-based-access-control/pim-integration
- Microsoft Learn: List Azure deny assignments - https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments
- Microsoft Learn: Cloud infrastructure entitlement management in Microsoft Defender for Cloud - https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions-management
- Microsoft Learn: New name for Azure Active Directory - https://learn.microsoft.com/en-us/entra/fundamentals/new-name
- Microsoft Learn: What are access reviews? - https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview

## Issues Found
- Updated Azure AD references to Microsoft Entra ID because Microsoft renamed Azure Active Directory and recommends the new product name for current content.
- Changed the access inventory wording from "across your subscriptions" to "in each subscription you manage" because the shown `az role assignment list --all` command lists assignments under the current subscription, not every subscription in a tenant.
- Replaced "over 300 built-in roles" with "many built-in roles" because current Microsoft Learn role-definition documentation states Azure RBAC has over 120 built-in roles.
- Softened the role naming convention explanation because role names ending in "Administrator" do not universally include Azure RBAC access management permissions.
- Revised the custom App Service role example to avoid broad wildcards that could include delete operations, and set `NotActions` to an empty array because `NotActions` is not a deny rule and only subtracts from allowed actions.
- Replaced Azure Blueprints-focused deny assignment guidance with deployment stacks and managed applications, because Microsoft Learn says users cannot directly create deny assignments and current deny settings are created by Azure, including through deployment stacks. Azure Blueprints is also scheduled for deprecation on July 11, 2026.
- Corrected the Activity Log example comments. The command lists recent control-plane activity; it does not by itself find role assignments where a principal has performed no actions.
- Clarified data plane permissions. Azure RBAC can authorize data plane actions through `DataActions`, but control plane wildcard permissions do not automatically grant data plane access.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
