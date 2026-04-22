# Validation Summary: How to Build a Serverless API Backend with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu and HCL
- AzureRM provider
- Azure Functions on Linux Consumption
- Azure Storage
- Azure API Management
- Azure Cosmos DB for NoSQL serverless
- Microsoft Entra ID / App Service Authentication (Easy Auth)
- Azure Key Vault references
- Azure Application Insights / Azure Monitor

## Sources Consulted
- OpenTofu configuration syntax: https://opentofu.org/docs/language/syntax/configuration/
- AzureRM `azurerm_linux_function_app` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app
- AzureRM `azurerm_service_plan` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- AzureRM `azurerm_api_management_backend` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_backend
- AzureRM `azurerm_cosmosdb_account` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account
- AzureRM `azurerm_cosmosdb_sql_database` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_database
- AzureRM `azurerm_cosmosdb_sql_container` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_container
- Azure Functions run-from-package documentation: https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package
- Azure Functions hosting and scale documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Azure Functions Consumption plan documentation: https://learn.microsoft.com/en-us/azure/azure-functions/consumption-plan
- Azure Functions monitoring documentation: https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring
- Azure Functions telemetry export documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-monitoring
- Azure App Service authentication and authorization documentation: https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization
- Microsoft Entra authentication for App Service and Azure Functions: https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad
- Azure App Service Key Vault references documentation: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Azure Cosmos DB serverless documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/serverless

## Issues Found
- The Function App snippet set `FUNCTIONS_WORKER_RUNTIME` in `app_settings` while also using `site_config.application_stack`. Current AzureRM provider documentation says runtime stack settings should be configured through `site_config`, so the redundant app setting was removed.
- The Function App snippet used the legacy `APPINSIGHTS_INSTRUMENTATIONKEY` app setting. Azure Functions documentation recommends `APPLICATIONINSIGHTS_CONNECTION_STRING`, and AzureRM exposes `application_insights_connection_string` in `site_config`, so the snippet now uses that provider field.
- `active_directory_v2.client_secret_setting_name` referenced `AAD_CLIENT_SECRET`, but the app setting was not defined. Added an `AAD_CLIENT_SECRET` Key Vault reference so the Easy Auth provider can resolve the configured secret setting.
- `WEBSITE_RUN_FROM_PACKAGE = "1"` is not supported for Linux Consumption apps. Microsoft documentation says Linux Consumption requires a package URL, so the setting now uses `var.function_package_url`.
- The Cosmos DB SQL container snippet used the outdated singular `partition_key_path` argument. The current AzureRM schema requires `partition_key_paths` as a list, so it was changed to `partition_key_paths = ["/userId"]`.
- The overview described Cosmos DB serverless as globally distributed data storage. Azure Cosmos DB serverless accounts are single-region, so the wording now says serverless data storage.
- The summary said Cosmos DB Serverless charges only for request units consumed. Microsoft documentation says serverless billing includes request units and storage, so the summary now mentions both.
- The summary implied the entire API stack scales to zero and that Application Insights provides distributed tracing with zero configuration. The wording now scopes scale-to-zero to the Function App and describes Application Insights as built-in Functions monitoring, with OpenTelemetry noted for end-to-end distributed tracing.
- Updated "Azure AD" references in prose to the current product name, Microsoft Entra ID.
- Changed the API Management comment from "Import Function App into APIM" to "Configure Function App as an APIM backend" because the shown resource creates a backend, not a full APIM API import.

## Review Notes
- The AzureRM provider still lists `Y1` as a valid Functions Consumption SKU, but Microsoft now describes Consumption as a legacy hosting plan and recommends Flex Consumption for new serverless Linux Function Apps. A future revision should consider updating the example to Flex Consumption.
- The snippets still assume supporting resources and variables exist, including the resource group, Key Vault secrets, Key Vault access/RBAC, Application Insights resource, API Management service, Function package URL, and function key.
- The fixed code was reviewed against current official documentation. Local `tofu` or `terraform` CLI validation was not run because neither CLI is installed in this environment.
