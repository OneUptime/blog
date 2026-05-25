# Validation Summary: How to Create Azure AD Conditional Access in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureAD provider
- Microsoft Entra ID / Azure AD Conditional Access
- Conditional Access named locations
- Conditional Access grant controls and session controls
- Microsoft Entra ID emergency access accounts

## Sources Consulted
- HashiCorp Terraform Registry: `azuread_conditional_access_policy` resource - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/conditional_access_policy
- HashiCorp Terraform Registry: `azuread_named_location` resource - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/named_location
- HashiCorp Terraform Registry: `azuread_application` data source - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application
- HashiCorp Terraform Registry: `azuread_directory_role` resource - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/directory_role
- HashiCorp Terraform Registry: `azuread_directory_role_assignment` resource - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/directory_role_assignment
- HashiCorp Terraform Registry: `azuread_user` resource - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/user
- Microsoft Learn: Conditional Access report-only mode - https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/concept-conditional-access-report-only
- Microsoft Learn: Conditional Access named locations and network signals - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-assignment-network
- Microsoft Learn: Conditional Access session controls - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-session
- Microsoft Learn: Manage emergency access accounts - https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access

## Issues Found
- The provider setup pinned `hashicorp/azuread` to `~> 2.0` and configured `hashicorp/azurerm` even though the examples only use Microsoft Entra ID resources. Updated the AzureAD provider constraint to `~> 3.0` and removed the unused AzureRM provider configuration.
- The MFA, location-blocking, compliant-device, and session-control examples depended on a group named `All Users`, which is not a built-in requirement for Conditional Access targeting. Replaced those references with `included_users = ["All"]`, which is the documented Conditional Access policy value for all users.
- The compliant-device policy referenced `azuread_application.hr_portal.client_id` and `azuread_application.finance_app.client_id` even though the examples define those as data sources. Changed the references to `data.azuread_application.*.client_id`.
- The session-controls example used nested `sign_in_frequency` and `persistent_browser` blocks that are not valid for the current AzureAD provider. Replaced them with `sign_in_frequency`, `sign_in_frequency_period`, and `persistent_browser_mode`.
- The emergency-access role assignment referenced `azuread_directory_role.global_admin.template_id` while declaring `global_admin` as a data source. Changed it to an `azuread_directory_role` resource, matching the provider's documented pattern for activating and assigning built-in directory roles.

## Review Notes
- The post still uses the legacy "Azure AD" name. Microsoft now brands the identity platform as Microsoft Entra ID, but the Terraform provider and many resource descriptions still use Azure Active Directory terminology, so this is understandable rather than technically blocking.
- The examples assume prerequisite API permissions and Conditional Access licensing are already in place. The provider documentation lists required Microsoft Graph permissions such as `Policy.ReadWrite.ConditionalAccess` and `Policy.Read.All`.
