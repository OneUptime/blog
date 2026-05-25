# Validation Summary: How to Create Azure VM Scale Sets in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Machine Scale Sets
- Azure Load Balancer
- Azure Monitor autoscale
- cloud-init

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_linux_virtual_machine_scale_set`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- HashiCorp AzureRM provider documentation for `azurerm_monitor_autoscale_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting
- HashiCorp AzureRM provider documentation for `azurerm_lb_nat_pool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_nat_pool
- HashiCorp AzureRM provider documentation for `azurerm_lb_probe`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_probe
- HashiCorp AzureRM provider documentation for `azurerm_lb_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_rule
- HashiCorp AzureRM provider documentation for `azurerm_public_ip`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Microsoft Learn supported metrics for `Microsoft.Compute/virtualMachineScaleSets`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachinescalesets-metrics

## Issues Found
- The introduction said the guide covered Linux and Windows scale sets, but the post only includes a Linux VMSS example. Changed the wording to say it covers a Linux scale set.
- The load balancer probe used `request_path = "/health"`, but the cloud-init example only installs and starts stock nginx, which serves `/` by default and would not normally return success for `/health`. Changed the probe path to `/` so the example health check matches the configured web server.
- The autoscale recurrence comment said "weekdays 8 AM to 6 PM EST", but the Terraform `recurrence` block defines a single weekday trigger at 8 AM and does not define a 6 PM transition. Changed the comment to "weekdays at 8 AM EST".

## Review Notes
The Terraform resources and arguments reviewed match current AzureRM provider documentation. The post pins AzureRM to `~> 3.0`; the reviewed resource arguments are still present in current provider documentation, but future readers may prefer testing against a newer provider constraint before using the examples in a new project.
