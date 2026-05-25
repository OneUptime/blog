# Validation Summary: How to Create Azure AD Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureAD provider
- HashiCorp AzureRM provider
- Microsoft Entra ID groups
- Microsoft 365 groups
- Dynamic group membership rules
- Azure RBAC role assignments

## Sources Consulted
- HashiCorp Terraform Registry: AzureAD `azuread_group` resource - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/group
- HashiCorp Terraform Registry: AzureAD `azuread_user` data source - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/user
- HashiCorp Terraform Registry: AzureAD Microsoft Graph guide - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/guides/microsoft-graph
- HashiCorp Terraform Registry: AzureRM `azurerm_role_assignment` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- HashiCorp Terraform provider registry API for current AzureAD and AzureRM versions - https://registry.terraform.io/v1/providers/hashicorp/azuread/versions and https://registry.terraform.io/v1/providers/hashicorp/azurerm/versions
- Microsoft Learn: Manage rules for dynamic membership groups in Microsoft Entra ID - https://learn.microsoft.com/en-ie/entra/identity/users/groups-dynamic-membership
- Microsoft Learn: Manage Microsoft Entra groups and group membership - https://learn.microsoft.com/en-ca/entra/fundamentals/how-to-manage-groups
- Microsoft Learn: Understand Azure role assignments - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments

## Issues Found
- The provider version constraints were stale for a 2026 post. Updated `azuread` from `~> 2.47` to `~> 3.8` and `azurerm` from `~> 3.80` to `~> 4.74`, matching the current provider major versions available from the Terraform Registry on 2026-05-25.
- The `prevent_duplicate_names` comment incorrectly said it prevents accidental membership changes. Changed it to explain that it checks for an existing group with the same display name.
- The dynamic group licensing note used old Azure AD Premium wording and omitted that the requirement applies to user-based dynamic groups. Updated it to Microsoft Entra ID P1/P2 licensing for user-based dynamic groups.
- The Microsoft 365 group example specified only the Terraform service principal as owner. The AzureAD provider documentation notes that Microsoft 365 groups require at least one user owner, so the example now includes `data.azuread_user.alice.id` as a user owner.
- The Microsoft 365 group description implied Teams channels are an automatic group feature. Reworded this to Microsoft Teams integration.
- The nested groups warning incorrectly said Conditional Access only evaluates one nesting level. Microsoft documentation says nested groups can be used for membership and Conditional Access scopes, while support varies for other scenarios. Replaced the warning with the documented limitations.
- The permissions note said a service principal needs the Groups Administrator directory role. Updated it to the documented Microsoft Graph application permissions (`Group.ReadWrite.All` or `Directory.ReadWrite.All`) for service principal authentication, and kept Groups Administrator for user principal authentication.

## Review Notes
Terraform CLI was not installed in the review environment, so I could not run `terraform validate`. The HCL snippets were checked against the current official provider schemas and Microsoft documentation instead.
