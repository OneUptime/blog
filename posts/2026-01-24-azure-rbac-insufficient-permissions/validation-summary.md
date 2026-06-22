# Validation Summary: How to Fix 'Insufficient Permissions' RBAC Errors in Azure

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Role-Based Access Control (RBAC)
- Azure CLI
- Microsoft Entra ID users, groups, service principals, and managed identities
- Azure Storage Blob data-plane RBAC
- Azure Key Vault access policies and Azure RBAC
- Azure Container Registry roles

## Sources Consulted
- Microsoft Learn: Azure RBAC overview: https://learn.microsoft.com/en-us/azure/role-based-access-control/overview
- Microsoft Learn: Understand Azure role definitions: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions
- Microsoft Learn: Azure CLI `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Assign Azure roles using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: List Azure role assignments using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-list-cli
- Microsoft Learn: Create or update Azure custom roles using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli
- Microsoft Learn: Azure built-in roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Azure built-in roles for Privileged: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/privileged
- Microsoft Learn: Troubleshoot Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/troubleshooting
- Microsoft Learn: Azure permissions and resource provider operations: https://learn.microsoft.com/en-us/azure/role-based-access-control/resource-provider-operations
- Microsoft Learn: Azure Key Vault RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure Key Vault RBAC vs. access policies: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy
- Microsoft Learn: Troubleshoot 403 errors in Azure Blob Storage: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/authentication/storage-troubleshoot-403-errors
- Microsoft Learn: Azure Container Registry RBAC roles overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview

## Issues Found
- The RBAC diagram labeled `NotActions` as denied actions. Azure RBAC `NotActions` are exclusions from allowed control-plane actions, not explicit deny rules, so the diagram label was changed to "Excluded Actions."
- The role-search command looked for `Microsoft.Compute/virtualMachines/start`, which would miss the actual action `Microsoft.Compute/virtualMachines/start/action` and common wildcard role definitions. The query was updated to search for the exact action and common wildcard matches.
- The built-in roles table described User Access Administrator as "Manage RBAC only." This was too narrow because the role manages user access and role assignments. The table entry was corrected.
- The "Cannot Manage RBAC" scenario recommended only User Access Administrator or Owner. Microsoft now documents Role Based Access Control Administrator as a scoped role for managing Azure RBAC role assignments, so the example was updated to use that role while still mentioning User Access Administrator and Owner as alternatives.
- The debugging script displayed `condition` as an "Inherited" column. In Azure role assignments, `condition` is for ABAC conditions, not whether the assignment was inherited. The query was corrected to show role and scope only.
- The propagation delay section said RBAC changes can take up to 5 minutes. Microsoft documentation states role assignment changes can take up to 10 minutes to take effect, with longer delays in some managed identity group-membership and management-group data-plane cases. The text and sleep example were updated to 10 minutes.

## Review Notes
The Azure CLI commands and custom role JSON format otherwise match current Microsoft Learn documentation. The local environment did not have Azure CLI installed, so command behavior was verified against official Microsoft Learn CLI documentation rather than local `az --help` output.
