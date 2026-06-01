# Validation Summary: Create Terraform Null Resources for Azure Post-Provisioning Script Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp null provider `null_resource`
- Terraform `terraform_data`
- Terraform provisioners (`local-exec`, `remote-exec`)
- AzureRM Terraform provider
- Azure CLI
- Azure Storage static website hosting
- Azure Database for PostgreSQL Flexible Server
- Azure Kubernetes Service (AKS)
- Helm
- Azure App Service for Linux
- Azure Key Vault
- Azure DNS

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform `terraform_data` documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- Azure CLI `az storage blob service-properties` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties
- Azure App Service Node.js configuration documentation: https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Azure CLI `az aks get-credentials` documentation: https://learn.microsoft.com/en-us/cli/azure/aks
- Azure CLI Azure DNS record set documentation: https://learn.microsoft.com/en-us/azure/dns/dns-operations-recordsets-cli
- Azure CLI `az keyvault` documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault
- AzureRM provider `azurerm_postgresql_flexible_server_database` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server_database
- AzureRM provider `azurerm_linux_web_app` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- AzureRM provider `azurerm_kubernetes_cluster` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- AzureRM provider `azurerm_resource_deployment_script_azure_cli` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_deployment_script_azure_cli

## Issues Found
- The PostgreSQL initialization example set `PGPASSWORD` twice: once inline in the shell command and once through the provisioner's `environment` map. I removed the inline `PGPASSWORD='${var.db_admin_password}'` assignment so the example relies on the `environment` map. This avoids shell-quoting problems for passwords containing special characters and reduces accidental exposure in the command text.

## Review Notes
- The Azure Storage static website example is technically valid, but current AzureRM provider versions also support managing static website hosting with `azurerm_storage_account_static_website`; the post already frames the CLI example as useful for provider-version gaps.
- Terraform and HashiCorp documentation recommend provisioners as a last resort. The post's guidance to prefer native Terraform resources or dedicated tooling when available is consistent with that recommendation.
- Local Terraform, Azure CLI, Helm, and kubectl binaries were not installed in the review environment, so command checks were performed against official documentation rather than local `--help` output.
