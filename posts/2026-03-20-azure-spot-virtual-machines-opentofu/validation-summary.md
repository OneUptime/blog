# Validation Summary: How to Configure Azure Spot Virtual Machines with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- Azure Spot Virtual Machines
- Azure Virtual Machine Scale Sets
- AzureRM provider for OpenTofu/Terraform
- Azure Scheduled Events
- Azure Custom Script Extension for Linux
- Azure CLI

## Sources Consulted
- Azure Spot Virtual Machines: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Azure Spot Virtual Machines for Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/use-spot
- Scheduled Events for Linux VMs in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/scheduled-events
- Run Custom Script Extension on Linux VMs in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Azure CLI `az vm` reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- OpenTofu CLI command reference: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AzureRM `azurerm_linux_virtual_machine`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM `azurerm_linux_virtual_machine_scale_set`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- AzureRM `azurerm_virtual_machine_extension`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension
- Azure Marketplace image reference details for Ubuntu 22.04 image identifiers: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/cli-ps-findimage

## Issues Found
- The `max_bid_price = -1` explanation was incomplete. I updated the post to state the Azure-documented behavior: it avoids price-based eviction and you never pay more than the on-demand price.
- The `spot_restore` comment incorrectly described zone rebalancing. I changed it to describe the documented behavior: Azure attempts to restore evicted Spot instances.
- The eviction-handler example used a one-shot `nohup` background process, which would not persist across reboot or deallocate/restart. I replaced it with a `systemd` service so the handler is installed persistently on the VM.
- The eviction-handler example used `aws s3 sync` without installing or configuring the AWS CLI, which made the snippet non-portable and not actually runnable as shown. I replaced it with a durable-storage placeholder comment and retained a safe `sync` operation.
- The eviction poll loop used a 5-second interval. I changed it to 1 second to align with Azure Scheduled Events guidance to poll frequently for maximal notice time.
- The `az vm show` example labeled `provisioningState` as the current VM state. I corrected it to use `--show-details` and query `powerState`, which matches Azure CLI behavior for runtime power state information.
- The `az vm list-skus` example was labeled as a Spot pricing check even though it only inspects SKU capabilities. I corrected the description to a Spot capability check and renamed the output field accordingly.
- The conclusion overstated two behaviors. I updated it so `spot_restore` is described as an automatic attempt to restore instances, and eviction notices are described as best-effort notices that Azure attempts to deliver up to 30 seconds before eviction.

## Review Notes
- The post is technically relevant and salvageable; no removal recommendation is needed.
- `azurerm_linux_virtual_machine_scale_set` is still a valid resource for this scenario, but in current AzureRM releases it provisions Uniform orchestration mode. AzureRM provides `azurerm_orchestrated_virtual_machine_scale_set` for Flexible orchestration mode if the post is expanded later.
- The local workspace did not have `az` or `tofu` installed, so command validation was done against official documentation rather than local `--help` output.
