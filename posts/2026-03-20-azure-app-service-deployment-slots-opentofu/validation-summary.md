# Validation Summary: How to Configure Azure App Service Deployment Slots with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service deployment slots
- OpenTofu with AzureRM provider resources
- HCL configuration for Azure App Service and slots
- Azure Key Vault references in App Service app settings
- Azure Application Insights configuration
- Azure CLI slot swap command

## Sources Consulted
- Azure App Service deployment slots: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Azure App Service Key Vault references: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Application Insights connection strings: https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings
- AzureRM `azurerm_linux_web_app` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- AzureRM `azurerm_linux_web_app_slot` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot
- AzureRM `azurerm_web_app_active_slot` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/web_app_active_slot

## Issues Found
1. **Sticky settings were configured with the wrong resource.** The post used `azurerm_web_app_active_slot`, which swaps a slot into production; it does not define which app settings remain with a slot. Replaced that example with the correct `sticky_settings` block on `azurerm_linux_web_app`.

2. **The app settings explanation was inaccurate.** App settings are not sticky by default. Only app setting names listed in `sticky_settings` stay with the slot during a swap. Updated the explanation and examples to reflect that behavior.

3. **The Key Vault reference examples were missing managed identities.** Azure App Service Key Vault references use the app's managed identity. Added `identity { type = "SystemAssigned" }` to the production app and staging slot examples.

4. **The Application Insights example used the older instrumentation key pattern.** Updated the samples to use `APPLICATIONINSIGHTS_CONNECTION_STRING` and the provider's `connection_string` attribute, which matches current Azure guidance.

5. **The Linux auto-swap section was incorrect and duplicated the same slot in a second resource.** Microsoft documents that auto swap isn't supported for App Service web apps on Linux. Replaced that section with an explicit `az webapp deployment slot swap` command to run after validation.

## Review Notes
- The examples are still partial snippets and assume the referenced resource group, service plan, Key Vault secrets, and Application Insights resources already exist.
- If readers add more slot-specific app settings than the ones shown, they should add those setting names to `sticky_settings` as well.
- `azurerm_web_app_active_slot` is a valid AzureRM resource for managing which slot is active in production, but it serves a different purpose than slot-specific app settings.
