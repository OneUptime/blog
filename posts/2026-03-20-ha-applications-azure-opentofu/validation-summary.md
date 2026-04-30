# Validation Summary: How to Deploy Highly Available Applications with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Virtual Machine Scale Sets (VMSS)
- Azure Load Balancer
- Azure Availability Zones
- OpenTofu / Terraform HCL
- AzureRM provider

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_service_plan`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/service_plan.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_linux_web_app`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_linux_virtual_machine_scale_set`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_virtual_machine_scale_set.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_lb`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/lb.html.markdown
- Microsoft Learn, Configure App Service plans for zone redundancy: https://learn.microsoft.com/en-us/azure/app-service/configure-zone-redundancy
- Microsoft Learn, Reliability in Azure App Service: https://learn.microsoft.com/en-us/azure/reliability/reliability-app-service
- Microsoft Learn, Use Application Health extension with Azure Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-health-extension
- Microsoft Learn, Configure rolling upgrades on Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-configure-rolling-upgrades
- Microsoft Learn, Azure Load Balancer Best Practices: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-best-practices
- Microsoft Learn, Public IP addresses in Azure: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn, App Service app settings reference: https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings

## Issues Found
- The App Service plan comments said zone redundancy required Premium v3 or higher and a minimum of three workers. Current Azure docs require a supported plan and scale unit, and at least two instances. I updated the comments to remove the incorrect hard requirement and to note that the worker count should align with the available zones in the region.
- The VMSS snippet used `orchestration_mode = "Flexible"` inside `azurerm_linux_virtual_machine_scale_set`. That resource is not the Flexible orchestration resource in the AzureRM provider. I removed that attribute and used a valid `upgrade_mode = "Rolling"` configuration instead.
- The VMSS snippet enabled `automatic_os_upgrade_policy` and `rolling_upgrade_policy` without the documented upgrade prerequisites. The provider requires `upgrade_mode` and a `health_probe_id` when using automatic or rolling upgrades on this resource. I added `upgrade_mode = "Rolling"` and `health_probe_id = azurerm_lb_probe.health.id`.
- The VMSS snippet combined a load balancer health probe with the Application Health Extension. Azure documents that only one health-monitoring source can be used for orchestration services such as automatic OS upgrades and instance repairs. I removed the Application Health Extension from the example and used the load balancer probe as the single health signal.
- The original summary claimed the Application Health Extension would automatically replace unhealthy instances, but the snippet did not configure automatic instance repair. I added an `automatic_instance_repair` block and updated the summary so the self-healing claim matches the code.
- The load balancer comment implied that Standard SKU alone means zone-redundant. I corrected the wording to say Standard is required for availability zones and kept the frontend explicitly configured as zone-redundant.

## Review Notes
- The examples are partial snippets and still rely on supporting resources defined elsewhere, such as the resource group, subnet, backend pool, public IP, Application Insights instance, and input variables.
- The App Service and load balancer examples assume a region and underlying platform footprint that support availability zones. For App Service specifically, `maximumNumberOfZones` for the plan must be greater than 1 before zone redundancy can be enabled.
