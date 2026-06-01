# Validation Summary: How to Configure Azure Cloud Shell with Terraform and Bicep

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cloud Shell
- Azure CLI
- Azure Storage and Blob containers
- Terraform and the AzureRM backend
- Terraform AzureRM provider
- Terraform Random provider
- Bicep
- Azure App Service for Linux

## Sources Consulted
- Azure Cloud Shell overview: https://learn.microsoft.com/en-us/azure/cloud-shell/overview
- Azure Cloud Shell features and preinstalled tools: https://learn.microsoft.com/en-us/azure/cloud-shell/features
- Persist files in Azure Cloud Shell: https://learn.microsoft.com/en-us/azure/cloud-shell/persisting-shell-storage
- Azure Cloud Shell FAQ and limits: https://learn.microsoft.com/en-us/azure/cloud-shell/faq-troubleshooting
- Azure CLI storage container command reference: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Authorize Azure Storage blob data operations with Azure CLI: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform AzureRM backend documentation for Terraform 1.7.x: https://developer.hashicorp.com/terraform/language/v1.7.x/settings/backends/azurerm
- Terraform releases: https://releases.hashicorp.com/terraform/
- Terraform AzureRM provider 4.x subscription ID guidance: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Terraform AzureRM Linux Web App resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Microsoft.Web/sites 2023-01-01 Bicep/ARM reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/sites
- Microsoft.Web/serverfarms 2023-01-01 Bicep/ARM reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/serverfarms
- Azure CLI Bicep commands: https://learn.microsoft.com/en-us/cli/azure/bicep
- Azure deployment group commands: https://learn.microsoft.com/en-us/cli/azure/deployment/group

## Issues Found
- Cloud Shell persistent storage was described as unconditional. Updated the wording to reflect current Cloud Shell behavior: users can choose persistent storage or an ephemeral session, and persistence only applies when storage is mounted.
- The Terraform custom binary install extracted into `~/clouddrive/bin/` without first creating the directory. Added `mkdir -p ~/clouddrive/bin`.
- The Terraform version example used Terraform 1.7.0, but the backend authentication guidance was reviewed against current Terraform behavior. Updated the example version to Terraform 1.15.5, the current stable release available from HashiCorp releases on the validation date.
- The Terraform state storage commands generated a storage account name but did not reuse it for container creation. Added `STORAGE_ACCOUNT_NAME` and used it consistently.
- The Azure Storage container creation command omitted explicit authentication mode. Added `--auth-mode login` to use Microsoft Entra credentials, matching Azure Storage CLI guidance.
- Microsoft Entra authorization for blob data operations requires an appropriate data-plane role. Added a Storage Blob Data Contributor role assignment before creating the state container.
- The Terraform backend example relied on implicit authentication wording. Added `use_cli = true` and `use_azuread_auth = true`, and clarified the required Storage Blob Data Contributor role for state access.
- The Terraform App Service example pinned AzureRM provider `~> 3.80`, which did not support `node_version = "20-lts"` in `azurerm_linux_web_app`. Updated the provider constraint to `~> 4.0`.
- AzureRM provider 4.x requires a subscription ID for plan/apply. Added an `ARM_SUBSCRIPTION_ID` export before `terraform init`.
- The Terraform configuration used `random_id` without declaring the Random provider in `required_providers`. Added the `hashicorp/random` provider declaration.
- The `.bashrc` persistence statement was unconditional. Updated it to apply when Cloud Shell is configured with persistent storage.

## Review Notes
Local `terraform`, `az`, and `bicep` binaries were not installed in this workspace, so commands were validated against official documentation rather than local `--help` output. Azure role assignments can take a few minutes to propagate; if the storage container creation fails immediately after role assignment, retrying after propagation is expected.
