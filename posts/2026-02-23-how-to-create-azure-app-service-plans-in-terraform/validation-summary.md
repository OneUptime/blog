# Validation Summary: How to Create Azure App Service Plans in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure App Service Plans
- Azure App Service Environment
- Azure Monitor autoscale settings

## Sources Consulted
- HashiCorp AzureRM provider `azurerm_service_plan` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- HashiCorp AzureRM provider `azurerm_monitor_autoscale_setting` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting
- HashiCorp Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform `regexall` function documentation: https://developer.hashicorp.com/terraform/language/functions/regexall
- Microsoft Learn, Azure App Service plan overview: https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Microsoft Learn, Azure App Service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-app-service-limits
- Microsoft Learn, Reliability in Azure App Service / availability zone support: https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service
- Microsoft Learn, supported Azure Monitor metrics for Microsoft.Web/serverfarms: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics

## Issues Found
- The multiple-plans example used `contains(each.key, "prod")` to test whether a map key contains a substring. Terraform's `contains` function checks whether a list, tuple, or set contains a value, not whether a string contains a substring. Changed this to `length(regexall("prod", each.key)) > 0`, which is compatible with the post's Terraform 1.0 prerequisite.
- The Isolated plan example showed `sku_name = "I1v2"` while leaving `app_service_environment_id` commented out. The AzureRM provider documentation states that Isolated SKUs can only be used with App Service Environments. Uncommented the `app_service_environment_id` assignment so the plan portion accurately reflects the required association with an App Service Environment.

## Review Notes
- The examples use AzureRM provider `~> 3.0`. AzureRM 4.x is current as of this review, but the `azurerm_service_plan` and `azurerm_monitor_autoscale_setting` arguments shown remain valid in the current provider documentation. A future update could move the post to AzureRM 4.x and include its provider authentication requirements.
- The autoscale metric names `CpuPercentage`, `MemoryPercentage`, and `HttpQueueLength` match the supported Azure Monitor metrics for `Microsoft.Web/serverfarms`.
- Zone redundancy is only supported for eligible App Service plan types and scale units in availability-zone regions. The post's Premium v3 examples are directionally correct, but real deployments should confirm region and scale-unit support.
