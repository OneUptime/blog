# Validation Summary: How to Create Service Principals with OpenTofu on Azure

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp AzureAD provider
- HashiCorp AzureRM provider
- Microsoft Entra ID / Azure AD applications and service principals
- Azure RBAC
- Azure Key Vault
- HCL

## Sources Consulted
- Microsoft Learn: Apps & service principals in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals
- Microsoft Learn: Securing service principals in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/architecture/service-accounts-principal
- Microsoft Learn: Understand Azure role assignments - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Microsoft Learn: Azure Key Vault autorotation - https://learn.microsoft.com/en-us/azure/key-vault/general/autorotation
- Microsoft Learn: Rotate secrets for single-credential resources in Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation
- Terraform Registry: `azuread_application` - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application
- Terraform Registry: `azuread_service_principal` - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/service_principal
- Terraform Registry: `azuread_application_password` - https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application_password
- Terraform Registry: `azurerm_role_assignment` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Terraform Registry: `azurerm_key_vault_secret` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret

## Issues Found
- The explanation of a service principal incorrectly described it as an instantiation in a subscription. I changed this to tenant, which matches Microsoft Entra's application object and service principal model.
- The `azuread_application_password` example used `timeadd(timestamp(), "8760h")` together with `ignore_changes = [end_date]`, and the comment incorrectly said this prevented accidental deletion. I replaced this with `end_date_relative = "8760h"`, which is the provider-supported way to set a one-year relative expiry without a moving timestamp.
- The `azurerm_role_assignment` example created a role assignment immediately after creating a new service principal but did not account for Azure AD / Microsoft Entra replication lag. I added `principal_type = "ServicePrincipal"` and `skip_service_principal_aad_check = true` to make the example consistent with Azure RBAC guidance and the AzureRM provider docs.
- The best-practices section said to automate secret rotation using Key Vault rotation policies. I changed this to a Key Vault secret rotation workflow, because current Azure guidance distinguishes secret rotation workflows from key rotation policies.

## Review Notes
- The post pins `azuread` to `~> 2.47` and `azurerm` to `~> 3.85`. These versions are older than the current latest major releases as of May 7, 2026, but the corrected snippets remain technically valid for the pinned versions.
- `azurerm_key_vault_secret` stores secret values in raw OpenTofu/Terraform state. Marking outputs as `sensitive` prevents normal CLI display, but it does not remove the secret from state. This is a caveat worth keeping in mind for future revisions.
