# Validation Summary: How to Create Azure Function Apps in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Functions
- Azure Function Apps
- Azure App Service Plans
- Azure Flex Consumption, Premium, and Dedicated hosting plans
- Azure Storage Accounts and Blob Containers
- Azure Application Insights
- Azure Service Bus
- Azure Event Hubs
- Azure deployment slots

## Sources Consulted
- HashiCorp AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp AzureRM `azurerm_function_app_flex_consumption` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/function_app_flex_consumption
- HashiCorp AzureRM `azurerm_linux_function_app` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app
- HashiCorp AzureRM `azurerm_linux_function_app_slot` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app_slot
- HashiCorp AzureRM `azurerm_service_plan` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- HashiCorp AzureRM `azurerm_eventhub` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub
- HashiCorp AzureRM `azurerm_servicebus_queue` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_queue
- HashiCorp AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Microsoft Learn, Azure Functions hosting options: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Microsoft Learn, Azure Functions deployment technologies: https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-technologies
- Microsoft Learn, Azure Functions Premium plan: https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan
- Microsoft Learn, Azure Functions Dedicated hosting: https://learn.microsoft.com/en-us/azure/azure-functions/dedicated-plan

## Issues Found
- The provider block used AzureRM `~> 3.0`, which is outdated for a current 2026 guide. Updated it to `~> 4.0` and added an explicit `subscription_id` variable because AzureRM v4 requires a subscription ID for plan/apply.
- The Linux Consumption example used the legacy `Y1` plan with `azurerm_linux_function_app`. Microsoft now recommends Flex Consumption for new Linux serverless function apps. Replaced the example with `azurerm_service_plan` SKU `FC1` and `azurerm_function_app_flex_consumption`, including the required deployment storage container settings.
- The introductory billing statement implied all Azure Functions plans only bill for compute time used. Updated it to describe consumption-based billing more accurately, including executions, execution time, memory, and always-ready instances.
- The Premium VNet variable default was an empty string, which would pass an invalid subnet ID when not set. Changed the default to `null` so Terraform can omit the optional argument.
- The Event Hub resource used the older `namespace_name` and `resource_group_name` arguments. Updated it to the current `namespace_id` argument.
- The event processor example still referenced the removed consumption plan resource. Updated it to use the Premium plan already defined in the guide.
- The deployment slot example targeted the former API function app and omitted `storage_account_access_key` while setting `storage_account_name`. Updated it to target the Premium function app and include the required storage access key.
- The output examples referenced the old `azurerm_linux_function_app.api` resource. Updated them to reference `azurerm_function_app_flex_consumption.api`.
- The summary still recommended the old consumption plan. Updated it to recommend Flex Consumption for spiky serverless workloads.

## Review Notes
Terraform CLI is not installed in this workspace, so `terraform validate` could not be run locally. The HCL snippets were checked statically against current HashiCorp AzureRM provider documentation and Microsoft Learn Azure Functions documentation.
