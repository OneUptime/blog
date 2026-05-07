# Validation Summary: How to Set Up Azure App Service Autoscaling with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Monitor Autoscale
- OpenTofu
- AzureRM provider
- HCL

## Sources Consulted
- Microsoft Learn: Azure App Service Plans - https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Microsoft Learn: Automatic scaling in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/manage-automatic-scaling
- Microsoft Learn: Azure App Service quotas and metrics - https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor
- Microsoft Learn: Understand autoscale settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-understanding-settings
- Microsoft Learn: Autoscale with multiple profiles - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-multiprofile
- Microsoft Learn: Autoscale common metrics - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-common-metrics
- Terraform Registry: `azurerm_service_plan` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- Terraform Registry: `azurerm_monitor_autoscale_setting` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting

## Issues Found
- The post said "Create App Service Plan and Web App," but the example only defined an `azurerm_service_plan`. I changed the heading and overview text to reflect that the autoscale configuration targets the App Service plan, not an individual web app.
- The `sku_name = "S2"` comment incorrectly described S2 as the minimum autoscale SKU. I changed the comment to describe S2 as an example Standard tier plan instead.
- The scheduled `businessHours` profile had no autoscale rules. In Azure Monitor, only the active profile is used, so the default profile's CPU rules would not apply during scheduled periods. I duplicated the CPU scale-out and scale-in rules into the scheduled profiles so metric-based scaling continues to work while those profiles are active.
- The original recurring schedule did not actually model "business hours," because recurring profiles remain active until the next profile starts. I added an `afterHours` recurring profile at 18:00 UTC on weekdays so the configuration scales back to the lower baseline after business hours.
- The memory example created a second `azurerm_monitor_autoscale_setting` for the same App Service plan. Azure Monitor supports only one autoscale setting per target resource, so I replaced that with a `rule` snippet that is added to the existing autoscale setting.
- I aligned `scale_action.value` with the provider's documented example format in the autoscale snippets.

## Review Notes
- Microsoft Learn currently contains mixed wording about autoscale availability for Basic versus Standard App Service plans. The post now follows the current dedicated autoscale documentation, which lists rule-based autoscale as available for Standard and up.
- The memory-based rule is intentionally shown as a reusable rule block. It needs to be added to each autoscale profile that should react to memory pressure.
- `tofu`, `opentofu`, and `terraform` were not installed in this workspace, so I did not run a local provider-backed validation command.
