# Validation Summary: How to Create Azure Monitor Autoscale Settings in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Monitor autoscale
- Azure App Service plans
- Azure Virtual Machine Scale Sets

## Sources Consulted
- HashiCorp AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp AzureRM `azurerm_monitor_autoscale_setting` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting
- HashiCorp AzureRM `azurerm_service_plan` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- Microsoft Learn, Overview of autoscale in Azure: https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-overview
- Microsoft Learn, Azure Monitor autoscaling common metrics: https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-common-metrics
- Microsoft Learn, Autoscale with multiple profiles: https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-multiprofile

## Issues Found
- The introductory list included Cloud Services as a current supported autoscale target. Microsoft's current autoscale overview lists supported services such as Virtual Machine Scale Sets, Web Apps/App Service, Azure API Management, Azure Data Explorer, Stream Analytics, SignalR Service, Azure Machine Learning, Azure Spring Apps, Media Services, and Service Bus. I changed the example list to use Azure API Management instead of Cloud Services.
- The Terraform provider constraint used AzureRM `~> 3.0`, which is outdated for a 2026 tutorial. I updated it to `~> 4.0` and added an explicit `subscription_id` variable in the provider configuration, matching current AzureRM 4.x provider requirements for plan/apply.

## Review Notes
The autoscale resource structure, profile/capacity/rule blocks, recurrence fields, notification blocks, scale action types, and metric names shown for App Service plans and VM scale sets match the official AzureRM and Azure Monitor documentation. The scheduled profile example is technically valid: each recurrence starts the corresponding profile, so the 8:00 business-hours profile remains active until the 18:00 off-hours profile starts.
