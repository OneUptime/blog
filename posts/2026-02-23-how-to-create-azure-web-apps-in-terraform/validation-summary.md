# Validation Summary: How to Create Azure Web Apps in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AzureRM Terraform provider
- Azure App Service / Azure Web Apps
- Azure App Service deployment slots
- Azure App Service custom domains and managed certificates
- Azure Application Insights
- Azure Log Analytics Workspace
- Azure Key Vault references
- Azure App Service VNet integration

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_linux_web_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- HashiCorp AzureRM provider documentation for `azurerm_linux_web_app_slot`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot
- HashiCorp AzureRM provider documentation for `azurerm_windows_web_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/windows_web_app
- HashiCorp AzureRM provider documentation for `azurerm_application_insights`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights
- HashiCorp AzureRM provider documentation for `azurerm_key_vault_access_policy`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy
- HashiCorp AzureRM provider documentation for `azurerm_key_vault_secret`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- HashiCorp AzureRM provider documentation for `azurerm_app_service_custom_hostname_binding`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_custom_hostname_binding
- HashiCorp AzureRM provider documentation for `azurerm_app_service_managed_certificate`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_managed_certificate
- HashiCorp AzureRM provider documentation for `azurerm_app_service_virtual_network_swift_connection`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service_virtual_network_swift_connection
- Microsoft Learn: Use Key Vault references as app settings in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Microsoft Learn: Connection strings in Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings

## Issues Found
- The provider constraint used AzureRM `~> 3.0`, which is not the current major version. Updated it to `~> 4.0` so the examples target the current AzureRM provider.
- The Application Insights settings used `APPINSIGHTS_INSTRUMENTATIONKEY`. Microsoft ended support for instrumentation-key ingestion on March 31, 2025, so the examples now use `APPLICATIONINSIGHTS_CONNECTION_STRING` with `azurerm_application_insights.web.connection_string`.
- The Application Insights resource did not specify a Log Analytics workspace. Added an `azurerm_log_analytics_workspace` and set `workspace_id` to use workspace-based Application Insights.
- The Key Vault example created a secret without granting the Terraform identity permission to set secrets in the new vault. Added an access policy for `data.azurerm_client_config.current.object_id` and a `depends_on` on the secret.
- The post description mentioned continuous deployment configuration, but the post does not configure continuous deployment. Updated the description to match the actual content.

## Review Notes
The example App Service names and custom domain are placeholders; real deployments must use globally unique app names and preconfigure the required DNS records for custom hostname validation.
