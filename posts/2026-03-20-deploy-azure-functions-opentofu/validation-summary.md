# Validation Summary: How to Deploy Azure Functions with OpenTofu - Deploy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform AzureRM provider (~> 3.100)
- Azure Functions (Linux Consumption / Y1 SKU)
- Azure Storage Account
- Azure App Service Plan
- Azure Application Insights
- Azure CLI (`az`) and Azure Functions Core Tools (`func`)
- Python 3.11 runtime
- HCL configuration

## Sources Consulted
- AzureRM provider — `azurerm_service_plan`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- AzureRM provider — `azurerm_linux_function_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app
- AzureRM provider — `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM provider — `azurerm_application_insights`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights
- Azure Functions: Run from package — https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package
- Azure Functions hosting plans (Consumption Y1, Premium EP1/EP2/EP3) — https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Azure CLI `az functionapp deployment source config-zip` — https://learn.microsoft.com/en-us/cli/azure/functionapp/deployment/source
- Azure Functions Core Tools `func azure functionapp publish` — https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local

## Issues Found
- **`WEBSITE_RUN_FROM_PACKAGE = "1"` on Linux Consumption**: The post used `WEBSITE_RUN_FROM_PACKAGE = "1"` in `app_settings`, but the Microsoft Learn documentation explicitly states that on the Linux Consumption plan only a URL value is supported — `1` is not supported on Linux Consumption. Since the deployment example uses `func azure functionapp publish` (which performs remote build on Linux Consumption), I replaced the `WEBSITE_RUN_FROM_PACKAGE = "1"` line with the documented remote-build settings `SCM_DO_BUILD_DURING_DEPLOYMENT = "true"` and `ENABLE_ORYX_BUILD = "true"`, which are the correct settings for this deployment path.

## Review Notes
- The AzureRM provider major version 3.x is still valid but is now superseded by 4.x. The `~> 3.100` pin remains usable, but readers starting a new project may prefer `~> 4.0`. The resource arguments shown (`azurerm_service_plan`, `azurerm_linux_function_app`, `application_stack { python_version = "3.11" }`) are valid in both 3.x and 4.x.
- The `random` provider is used (`random_string`) but is not declared in `required_providers`. OpenTofu/Terraform will auto-install it from the registry, so the configuration still works, but explicit declaration is best practice.
- `azurerm_application_insights.ai.instrumentation_key` is deprecated by Microsoft in favor of `connection_string`. The post correctly mentions both, though new deployments should prefer the connection string only.
- The Premium plan SKUs (`EP1`, `EP2`, `EP3`) and the Consumption SKU (`Y1`) cited in the conclusion are accurate.
- The storage account name pattern (`stfuncdemo${random_string.suffix.result}`, 10 + 6 chars, lowercase alphanumeric) satisfies Azure's 3–24 char lowercase-alphanumeric requirement.
- Linux Y1 (Consumption) is supported by `azurerm_service_plan`; this combination is correct.
- Both deployment commands (`func azure functionapp publish` and `az functionapp deployment source config-zip`) are syntactically correct.
