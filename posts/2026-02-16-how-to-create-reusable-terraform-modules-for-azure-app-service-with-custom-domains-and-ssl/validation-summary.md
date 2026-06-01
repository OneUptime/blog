# Validation Summary: How to Create Reusable Terraform Modules for Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure App Service
- Azure App Service custom domains
- Azure App Service managed certificates and certificate bindings
- Azure Key Vault certificates
- Azure Monitor diagnostic settings
- Azure Monitor autoscale settings

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_linux_web_app - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- HashiCorp Terraform Registry: azurerm_windows_web_app - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/windows_web_app
- HashiCorp Terraform Registry: azurerm_app_service_custom_hostname_binding - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_custom_hostname_binding
- HashiCorp Terraform Registry: azurerm_app_service_managed_certificate - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_managed_certificate
- HashiCorp Terraform Registry: azurerm_app_service_certificate - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_certificate
- HashiCorp Terraform Registry: azurerm_app_service_certificate_binding - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_certificate_binding
- HashiCorp Terraform Registry: azurerm_monitor_diagnostic_setting - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Microsoft Learn: Set up an existing custom domain name for Azure App Service - https://learn.microsoft.com/azure/app-service/app-service-web-tutorial-custom-domain
- Microsoft Learn: Install a TLS/SSL certificate in Azure App Service - https://learn.microsoft.com/azure/app-service/configure-ssl-certificate
- Microsoft Learn: Azure App Service subscription limits and feature support - https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits

## Issues Found
- The provider constraint allowed current AzureRM 4.x versions while the diagnostic setting example still used the older `metric` block. Updated the provider constraint to `>= 4.33.0` and changed the diagnostic setting to use `enabled_metric`.
- The Key Vault certificate example passed an Azure Key Vault certificate ID directly to `azurerm_app_service_certificate_binding.certificate_id`. That argument expects an App Service certificate ID. Updated the module to accept `key_vault_secret_id`, create an `azurerm_app_service_certificate`, and bind that App Service certificate resource.
- The Key Vault certificate import omitted `app_service_plan_id`, which the provider documentation requires in Basic and Premium App Service Plan scenarios. Added `app_service_plan_id = azurerm_service_plan.this.id`.
- The Windows Web App resource exposed module inputs for runtime stack and connection strings but did not apply them. Added a Windows `application_stack` block and connection string handling consistent with the provider schema.
- The hostname binding snippet set `ssl_state` to `SniEnabled` while also managing SSL through `azurerm_app_service_certificate_binding`. Removed the redundant SSL state and thumbprint assignment so certificate bindings are the source of truth.

## Review Notes
Terraform was not installed in the local workspace, so `terraform fmt` and `terraform validate` could not be run. The HCL snippets were reviewed manually against current official provider and Microsoft documentation.
