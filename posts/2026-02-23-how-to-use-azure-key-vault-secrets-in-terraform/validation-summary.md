# Validation Summary: How to Use Azure Key Vault Secrets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Key Vault
- Azure RBAC and Key Vault access policies
- Azure App Service managed identities and Key Vault references
- Azure Database for PostgreSQL Flexible Server
- Azure Kubernetes Service Secrets Store CSI Driver integration
- Azure Monitor diagnostic settings

## Sources Consulted
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_key_vault` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_key_vault_secret` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_postgresql_server` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_server
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_postgresql_flexible_server` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_linux_web_app` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_kubernetes_cluster` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_key_vault_certificate` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_certificate
- HashiCorp Terraform AzureRM Provider documentation: `azurerm_monitor_diagnostic_setting` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- HashiCorp Terraform AzureRM Provider 4.0 upgrade guide - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Microsoft Learn: Use Key Vault references as app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure role-based access control - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Migrate to Azure RBAC from access policies - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-migration
- HashiCorp Terraform documentation: Protect sensitive input variables - https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- OneUptime blog link check: AWS Secrets Manager with Terraform - https://oneuptime.com/blog/post/2026-02-23-how-to-use-aws-secrets-manager-with-terraform/view
- OneUptime blog link check: GCP Secret Manager with Terraform - https://oneuptime.com/blog/post/2026-02-23-how-to-use-gcp-secret-manager-with-terraform/view

## Issues Found
- The Key Vault examples used `enable_rbac_authorization`, but the current AzureRM resource argument is `rbac_authorization_enabled`. Updated both RBAC and access-policy examples to the current argument name.
- The PostgreSQL example used `azurerm_postgresql_server`, which is deprecated and tied to Azure Database for PostgreSQL Single Server, retired on 2025-03-28. Updated the example to `azurerm_postgresql_flexible_server` with current Flexible Server fields and a valid storage size.
- The JSON connection secret referenced `azurerm_postgresql_server.main.fqdn`. Updated it to reference `azurerm_postgresql_flexible_server.main.fqdn`.
- The App Service example assigned a user-assigned managed identity but did not configure that identity for Key Vault reference resolution. Added `key_vault_reference_identity_id`.
- The diagnostic setting example used the older `metric` block. Updated it to the current `enabled_metric` block.
- The introduction implied Terraform can keep secrets out of state. Clarified that managed or read secret values are stored in Terraform state and that backend and plan files must be protected.

## Review Notes
- The examples are still illustrative snippets, not a complete standalone Terraform module. Variables and supporting resources such as `var.allowed_ips`, `azurerm_service_plan.main`, and `azurerm_log_analytics_workspace.main` are assumed to be defined elsewhere.
- For network-restricted Key Vaults, App Service and Terraform runners also need network paths allowed by the vault rules; this is deployment-specific and not fully shown in the snippets.
