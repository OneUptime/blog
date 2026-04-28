# Validation Summary: How to Configure Azure Backend with Service Principal Authentication in Op (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Azure Blob Storage (azurerm backend)
- Azure Active Directory Service Principals
- Azure CLI (`az ad sp`)
- Azure RBAC (Storage Blob Data Contributor role)
- GitHub Actions CI/CD
- Client certificate (PFX/PKCS12) authentication

## Sources Consulted
- HashiCorp Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- OpenTofu azurerm backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- Azure CLI `az ad sp credential` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp/credential
- Azure CLI `az ad sp create-for-rbac` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn — Azure CLI Service Principal tutorial: https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-1
- GitHub Action opentofu/setup-opentofu: https://github.com/opentofu/setup-opentofu
- Azure Storage RBAC roles documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access

## Issues Found
No technical issues found.

Verified specifically:
- The four `ARM_*` environment variables (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`) are the correct names for Service Principal authentication with the azurerm backend.
- All azurerm backend block arguments used in the post (`resource_group_name`, `storage_account_name`, `container_name`, `key`, `subscription_id`, `tenant_id`, `client_id`, `client_certificate_path`, `client_certificate_password`) are valid configuration arguments per both HashiCorp and OpenTofu docs. `client_certificate_password` is documented as a valid block argument (not env-var-only).
- `az ad sp create-for-rbac --name --role --scopes` syntax is correct and the documented output keys (`appId`, `displayName`, `password`, `tenant`) match.
- `az ad sp credential reset --id --display-name` is valid; `--display-name` is a documented optional flag.
- `az ad sp credential delete --id --key-id` is valid syntax.
- `opentofu/setup-opentofu@v1` is the correct official GitHub Action.
- "Storage Blob Data Contributor" is the appropriate minimal data-plane RBAC role for read/write/delete on the state blob.

## Review Notes
- The post title appears truncated ("in Op (2)" instead of "in OpenTofu"), but this is a content/editorial concern rather than a technical inaccuracy and is outside the scope of technical correction.
- `opentofu/setup-opentofu@v2` is also available as a more recent major version — `@v1` still works and is technically valid, so no change is required, but readers may want to consider pinning to the latest major.
- The GitHub Actions example does not pin a tofu version via the action's `tofu_version` input; relying on the action's default is fine for an introductory example, though pinning is a good practice for reproducible CI builds.
- The `client_certificate_path` example uses a `.pfx` file, which is correct (the azurerm backend expects PKCS12 format).
