# Validation Summary: How to Create Azure RBAC Role Assignments Using Terraform with Microsoft Entra

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp AzureAD provider
- Azure RBAC
- Microsoft Entra ID service principals and app registrations
- Azure Key Vault RBAC
- GitHub Actions workload identity federation
- Azure Blob Storage Terraform backend

## Sources Consulted
- HashiCorp AzureAD provider v2.47 `azuread_application` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/resources/application.md
- HashiCorp AzureAD provider v2.47 `azuread_service_principal` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/resources/service_principal.md
- HashiCorp AzureAD provider v2.47 `azuread_application_federated_identity_credential` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/v2.47.0/docs/resources/application_federated_identity_credential.md
- HashiCorp AzureRM provider v3.80 `azurerm_role_assignment` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/role_assignment.html.markdown
- HashiCorp AzureRM provider v3.80 `azurerm_role_definition` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/role_definition.html.markdown
- HashiCorp AzureRM provider v3.80 `azurerm_key_vault` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/key_vault.html.markdown
- Terraform `uuidv5` function documentation: https://docs.hashicorp.com/terraform/language/functions/uuidv5
- Terraform `azurerm` backend documentation: https://developer.hashicorp.com/terraform/language/settings/backends/azurerm
- Microsoft Learn, Azure Key Vault RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn, Azure built-in roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn, Azure role assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Microsoft Learn, workload identity federation trust configuration: https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust
- GitHub Docs, OpenID Connect reference: https://docs.github.com/actions/reference/security/oidc

## Issues Found
- The post used `tags` on `azuread_application` and `azuread_service_principal` as organizational metadata. The AzureAD provider documents these tags as special Entra application/service-principal behavior tags, not normal practitioner metadata. Changed those examples to use `notes` for operational context.
- The role assignment example said `skip_service_principal_aad_check` skips validation during plan. The provider applies this to role assignment creation for newly provisioned service principals affected by Entra replication lag. Updated the comment accordingly.
- The role assignment GUID section said Azure generates the random GUID for each Terraform-created assignment. The AzureRM provider documentation states the provider generates a GUID when `name` is omitted. Updated the explanation.
- The deterministic role-assignment `uuidv5` example used the `dns` namespace with a non-DNS name string. Changed it to use the `url` namespace with a URL-form name that includes tenant, principal, role, and scope inputs.

## Review Notes
The post remains pinned to AzureRM `~> 3.80` and AzureAD `~> 2.47`; the examples were reviewed against those pinned versions. New projects may prefer evaluating the latest major provider versions before adoption because provider major upgrades can introduce authentication and schema changes.
