# Validation Summary: How to Configure Azure Backend with Service Principal Authentication in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu `azurerm` backend
- Azure Service Principals / Microsoft Entra ID
- Azure Storage RBAC
- Azure CLI
- GitHub Actions
- OpenSSL
- HCL

## Sources Consulted
- OpenTofu documentation: Backend Type `azurerm` — https://opentofu.org/docs/language/settings/backends/azurerm/
- Azure CLI reference: `az ad sp create-for-rbac` — https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Azure CLI tutorial: password-based service principals — https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-2?view=azure-cli-latest
- Azure CLI reference: `az ad sp credential reset` / `list` — https://learn.microsoft.com/en-us/cli/azure/ad/sp/credential?view=azure-cli-latest
- Azure CLI tutorial: certificate-based service principals — https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-3?view=azure-cli-latest
- Azure CLI reference: `az ad app federated-credential create` — https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential?view=azure-cli-latest
- Microsoft Learn: Authorize access to blobs using Microsoft Entra ID — https://learn.microsoft.com/en-us/azure/storage/common/storage-auth-aad-app
- Microsoft Learn: Assign an Azure role for access to blob data — https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access
- Terraform Registry: `azurerm_storage_container` resource — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- Terraform Registry: `azuread_service_principal` resource — https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/service_principal

## Issues Found

1. **The backend authentication examples were missing `use_azuread_auth = true`.** In OpenTofu, a service principal without this setting will authenticate to Azure and then try to obtain the storage account access key. That does not match the post's `Storage Blob Data Contributor` RBAC guidance. I added `use_azuread_auth = true` to both the client-secret and certificate backend examples so they work with Entra ID-backed blob access as described.

2. **The RBAC section included an incorrect `Storage Blob Data Reader` example for backend state access.** The OpenTofu backend needs read, write, and delete access to the state blob, so `Storage Blob Data Reader` is insufficient. I changed the section to use `Storage Blob Data Contributor` consistently and made the second example an alternative container-scoped assignment for least privilege.

3. **The secret rotation command was unsafe as written.** `az ad sp credential reset` overwrites existing credentials by default. For rotation, appending a new credential first is the safer pattern. I added `--append` and updated the comment accordingly.

## Review Notes
- `az ad sp create-for-rbac --name "sp-opentofu-state"` is valid, but Microsoft notes that display names are not unique and the command can modify an existing application or service principal if names collide. In production, use naming conventions that avoid collisions and verify the created app/service principal IDs.
- The federated identity example is technically correct for creating the federated credential. A full GitHub Actions OIDC workflow would also need `permissions: id-token: write` and backend configuration using `use_oidc = true`.
