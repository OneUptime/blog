# Validation Summary: How to Use Azure RBAC Custom Roles Scoped to Resource Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure RBAC
- Azure custom roles
- Azure resource groups
- Azure CLI
- Azure Monitor activity log alerts
- Azure Key Vault RBAC
- Azure Storage data plane permissions
- Microsoft Entra security groups

## Sources Consulted
- Azure custom roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Understand Azure role definitions: https://learn.microsoft.com/en-sg/azure/role-based-access-control/role-definitions
- Azure built-in roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Create an Azure custom role using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/tutorial-custom-role-cli
- Assign Azure roles using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Azure CLI role assignment reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Azure CLI activity log alert reference: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert
- Azure permissions for Security / Microsoft.KeyVault operations: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/security
- Key Vault RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found
- The post stated that the built-in Contributor role can manage role assignments and includes `Microsoft.Authorization/roleAssignments/write`. Microsoft documentation states that Contributor grants broad resource management access but does not allow Azure RBAC role assignment. Updated the explanation to reflect that Contributor is still too broad for resource management but does not grant role-assignment rights.
- The main JSON role definition contained comments while instructing the reader to save it as a JSON file. JSON does not allow comments. Removed comments from the JSON snippets so they can be saved and passed to `az role definition create`.
- The web app role claimed read/write Key Vault secret access but only included Key Vault control-plane permissions. Added the relevant Key Vault secret data-plane actions for reading metadata, getting secret values, setting secret values, and updating secret attributes.
- The web app role included SQL server firewall rule management while the post said development teams should not modify firewalls. Removed `Microsoft.Sql/servers/firewallRules/*` from the sample role.
- The policy-related `NotActions` used `Microsoft.PolicyInsights/*`, which does not represent Azure Policy assignment or definition management. Replaced it with policy assignment, definition, set definition, and exemption actions under `Microsoft.Authorization`.
- The role-assignment negative test used `az role assignment create --resource-group`, but the Azure CLI create command requires `--scope`. Replaced the command with a resource-group scope.
- The test wording said the role-assignment operation failed because it was "excluded by NotActions." Because `NotActions` is not a deny rule and RBAC permissions are additive, changed the wording to "not granted by this role."

## Review Notes
Azure CLI was not installed in the local workspace, so command syntax was verified against current Microsoft Learn CLI reference documentation instead of local `az --help` output.
