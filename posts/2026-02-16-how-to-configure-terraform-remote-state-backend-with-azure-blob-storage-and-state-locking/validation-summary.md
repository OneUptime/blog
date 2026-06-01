# Validation Summary: How to Configure Terraform Remote State Backend with Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform remote state and state locking
- Terraform `azurerm` backend
- Azure Blob Storage
- Azure Storage account and container configuration
- Azure CLI
- Microsoft Entra ID authentication, service principals, and managed identity
- Azure Blob Storage lifecycle management and blob versioning

## Sources Consulted
- HashiCorp Terraform `azurerm` backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Microsoft Learn, Store Terraform state in Azure Storage: https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage
- Microsoft Learn, Create an Azure Storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn, Azure CLI `az storage account management-policy`: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- Microsoft Learn, Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn, Authorize access to blob data with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli

## Issues Found
- The backend authentication examples implied Azure CLI credentials would be picked up without backend authentication flags. Updated the backend examples to use direct Microsoft Entra ID authentication with `use_azuread_auth = true` and `use_cli = true` for local Azure CLI authentication, matching current Terraform backend documentation.
- The prerequisites did not mention data-plane permissions needed for `az storage container create --auth-mode login` and Terraform Entra ID access to the blob. Added the need for a role such as Storage Blob Data Contributor, or permission to assign it.
- The service principal example omitted the backend flag needed for direct Microsoft Entra ID data-plane authentication. Added `ARM_USE_AZUREAD=true`.
- The managed identity example did not explicitly enable direct Microsoft Entra ID authentication. Added `use_azuread_auth = true`.
- The post stated that a fresh `terraform init` creates an empty state file in the blob container. Corrected this to say `terraform init` configures the backend and the blob is created when Terraform first writes state, such as after a successful `terraform apply`.
- The lifecycle policy used `prefixMatch: ["tfstate/"]`, but Azure lifecycle policy prefixes start with the container name and should include the blob prefix. Updated it to `["tfstate/prod/"]` for the example state path.
- The partial backend configuration example omitted authentication settings. Updated it to include `use_azuread_auth = true` and pass `use_cli=true` during initialization for the local Azure CLI flow.

## Review Notes
The post is technically relevant and the main workflow is valid after the corrections. For production CI/CD, OpenID Connect / workload identity federation is the current preferred pattern over client secrets, but the service principal client-secret flow remains a supported backend authentication option.
