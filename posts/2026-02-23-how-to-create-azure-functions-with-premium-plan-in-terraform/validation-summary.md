# Validation Summary: How to Create Azure Functions with Premium Plan in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure-as-code guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- HashiCorp Random Provider
- Azure Functions Premium Plan
- Azure App Service Plan / Elastic Premium
- Azure Virtual Network integration
- Azure Storage private endpoints
- Azure Application Insights and Log Analytics

## Sources Consulted
- Azure Functions hosting options: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale
- Azure Functions Premium plan: https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan
- Azure Functions Node.js developer guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Functions networking options: https://learn.microsoft.com/en-au/azure/azure-functions/functions-networking-options
- Azure Storage private endpoints: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Terraform AzureRM provider 4.x configuration: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform AzureRM `azurerm_service_plan` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- Terraform AzureRM `azurerm_linux_function_app` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app
- Terraform AzureRM `azurerm_linux_function_app_slot` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app_slot

## Issues Found
- The post described Premium Plan execution duration as "unlimited" without caveats. Updated the wording to state the default 30 minute timeout and unbounded maximum when configured in `host.json`, matching Azure Functions hosting limits.
- The post conflated pre-warmed instances with always-ready instances. Updated the explanation and Terraform examples to use `elastic_instance_minimum` for always-ready minimum instances and `pre_warmed_instance_count` for the pre-warmed scale-out buffer.
- The Terraform provider constraint used AzureRM `~> 3.80`. Updated the example to AzureRM `~> 4.0`, added an explicit `subscription_id` variable required for AzureRM 4.x plan/apply operations, and declared the `random` provider used by `random_string`.
- The Function App examples used Node.js 18 and manually set `WEBSITE_NODE_DEFAULT_VERSION`. Updated the runtime to Node.js 20 and removed the manual app setting because AzureRM sets the Node app setting from `site_config.application_stack.node_version`.
- The scaling section showed CPU-based `azurerm_monitor_autoscale_setting` rules for an Elastic Premium Function plan. Replaced it with guidance for Premium Plan event-driven scaling using `premium_plan_auto_scale_enabled`, `maximum_elastic_worker_count`, and `app_scale_limit`.
- The private endpoint section implied a private endpoint secured the whole storage account. Clarified that the example creates a private endpoint for the Blob service.

## Review Notes
Terraform CLI was not installed in the review environment, so I could not run `terraform validate`. The HCL was reviewed against the current official AzureRM provider documentation and Azure documentation instead.
