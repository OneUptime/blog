# Validation Summary: How to Fix 'Conflict' Errors When Deploying Azure Resources with Terraform

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Resource Manager
- Azure CLI
- Terraform CLI
- Terraform AzureRM provider
- Terraform Random provider
- Azure Storage remote state backend
- Azure resource locks

## Sources Consulted
- Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform import command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform plan refresh-only documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform refresh command documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform force-unlock command documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Azure CLI az resource documentation: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Azure CLI az lock documentation: https://learn.microsoft.com/en-us/cli/azure/lock?view=azure-cli-latest
- Azure management locks REST API documentation: https://learn.microsoft.com/en-us/rest/api/resources/management-locks/create-or-update-at-resource-level
- Azure Storage account naming documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure Key Vault identifiers documentation: https://learn.microsoft.com/en-us/azure/key-vault/general/about-keys-secrets-certificates
- Azure Container Registry quickstart documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-portal
- Terraform AzureRM provider documentation and GitHub repository: https://registry.terraform.io/providers/hashicorp/azurerm/latest and https://github.com/hashicorp/terraform-provider-azurerm
- Terraform Random provider random_string documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/string

## Issues Found
- The import example used `azurerm_app_service.example`. The AzureRM provider documentation marks `azurerm_app_service` as deprecated and recommends `azurerm_linux_web_app` or `azurerm_windows_web_app`, so the example was changed to `azurerm_linux_web_app.example`.
- The provider version example used `~> 3.80` while describing an update to the latest stable version. The current AzureRM provider line is 4.x, so the example was changed to `~> 4.0` and the comment was adjusted to say "latest stable major version."

## Review Notes
Terraform and Azure CLI were not installed in the local workspace, so command validation was performed against official CLI and provider documentation rather than local `--help` output. The remaining examples and claims matched the referenced documentation: Azure Storage backend supports state locking, `terraform import`, `terraform force-unlock`, `terraform plan/apply -refresh-only`, `az resource show`, `az lock list`, Azure management lock levels, storage account naming, and `random_string` arguments are all valid.
