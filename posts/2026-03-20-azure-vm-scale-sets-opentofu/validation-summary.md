# Validation Summary: How to Create Azure VM Scale Sets with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual Machine Scale Sets (VMSS)
- AzureRM provider
- Azure Monitor Autoscale
- Azure Load Balancer
- Azure CLI

## Sources Consulted
- AzureRM provider docs for `azurerm_linux_virtual_machine_scale_set`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/linux_virtual_machine_scale_set.html.markdown
- AzureRM provider docs for `azurerm_monitor_autoscale_setting`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/monitor_autoscale_setting.html.markdown
- AzureRM provider docs for `azurerm_lb_probe`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/lb_probe.html.markdown
- AzureRM provider docs for `azurerm_lb_rule`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/lb_rule.html.markdown
- Azure VM Scale Sets orchestration modes: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes
- Manage a Virtual Machine Scale Set with the Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-manage-cli
- Azure CLI `az vmss` reference: https://learn.microsoft.com/en-us/cli/azure/vmss?view=azure-cli-lts
- Supported metrics for `Microsoft.Compute/virtualmachineScaleSets`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachinescalesets-metrics
- OpenTofu CLI docs for `init`, `plan`, and `apply`: https://opentofu.org/docs/cli/init/ , https://opentofu.org/docs/cli/commands/plan/ , https://opentofu.org/docs/v1.11/cli/commands/apply/
- Azure Linux VM image example using Ubuntu Jammy Gen2: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-bicep

## Issues Found
- The post used `upgrade_mode = "RollingUpgrade"`, but the AzureRM VMSS resource accepts `Automatic`, `Manual`, or `Rolling`. I changed it to `Rolling`.
- The VMSS example enabled rolling upgrades and automatic OS upgrades without setting `health_probe_id`, even though the provider requires a health probe when `upgrade_mode` is `Automatic` or `Rolling`. I added `health_probe_id = azurerm_lb_probe.http.id`.
- The VMSS NIC block attached the scale set to a load balancer backend pool, but the provider documentation notes that this configuration also needs a load balancer rule and an explicit dependency. I added `depends_on = [azurerm_lb_rule.http]`.
- The autoscaling guidance said to let autoscale manage runtime capacity, but without ignoring changes to `instances`, later `tofu apply` runs can try to push the scale set back to the declared count. I added `lifecycle { ignore_changes = [instances] }` and updated the conclusion to reflect that behavior.
- The introduction implied the shown resource supported flexible orchestration for mixing VM types and sizes. In AzureRM, `azurerm_linux_virtual_machine_scale_set` creates a Uniform VMSS; Flexible orchestration uses `azurerm_orchestrated_virtual_machine_scale_set`. I corrected that wording.
- The prerequisites were incomplete for the snippets shown. The post references a subnet, load balancer, frontend IP configuration name, and backend pool, so I updated the prerequisites to match the code.
- The autoscale `scale_action.value` fields were changed to strings to align with the provider examples.

## Review Notes
- The post is now technically consistent, but it still assumes existing definitions for `azurerm_lb`, `azurerm_lb_backend_address_pool`, and the referenced input variables. That is acceptable because the prerequisites now make those dependencies explicit.
- Flexible orchestration and instance mix are valid Azure VMSS features, but they require a different AzureRM resource than the one used in this guide.
