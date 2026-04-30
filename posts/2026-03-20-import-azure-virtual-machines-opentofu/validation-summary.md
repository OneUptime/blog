# Validation Summary: How to Import Azure Virtual Machines into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Virtual Machines
- Azure CLI
- Azure Managed Disks
- Azure networking
- `hashicorp/azurerm`

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- Azure CLI query documentation: https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query?view=azure-cli-latest
- Azure CLI `az vm` documentation: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Azure CLI `az vm nic` documentation: https://learn.microsoft.com/en-us/cli/azure/vm/nic?view=azure-cli-lts
- Azure CLI `az disk` documentation: https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest
- Azure Compute REST `Virtual Machines - Get`: https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/get?view=rest-compute-2025-04-01
- Azure Virtual Network REST `Network Interfaces - Get`: https://learn.microsoft.com/en-us/rest/api/virtualnetwork/network-interfaces/get?view=rest-virtualnetwork-2025-05-01
- Azure Compute REST `Disks - Get`: https://learn.microsoft.com/en-us/rest/api/compute/disks/get?tabs=HTTP&view=rest-compute-2024-07-01
- AzureRM provider docs for `azurerm_linux_virtual_machine`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_virtual_machine.html.markdown
- AzureRM provider docs for `azurerm_network_interface`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/network_interface.html.markdown
- AzureRM provider docs for `azurerm_managed_disk`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/managed_disk.html.markdown
- AzureRM provider docs for `azurerm_virtual_machine_data_disk_attachment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_machine_data_disk_attachment.html.markdown

## Issues Found
- The introduction claimed the guide covered the "full VM stack" including availability set configuration, but the post did not actually import an availability set resource. I narrowed the wording so the scope matches what the guide covers.
- The discovery commands did not collect enough data to build import-safe HCL. I added queries for the admin username, existing SSH public key, availability set ID, OS disk settings, VM tags, NIC IP configuration name, private IP allocation mode, NIC tags, and managed disk details.
- The HCL examples hard-coded values like VM size, tags, image version, NIC IP allocation, and a local SSH key file path. Those values would often differ from the existing VM and could produce drift or replacement plans after import. I changed the snippets to use values gathered from the existing resources instead.
- The NIC example always used `private_ip_address_allocation = "Dynamic"`. Azure NICs can also use `Static`, which requires `private_ip_address` to be set. I corrected the example to handle both modes.
- The VM example used `source_image_reference.version = "latest"` while presenting the block as "matching HCL." For import, the configuration should match the existing VM's actual image version. I changed the snippet to use the discovered image version and moved the `ignore_changes` advice to a conditional note in the conclusion.
- The data disk section imported only the `azurerm_managed_disk` resource. The provider documentation shows the attachment is a separate `azurerm_virtual_machine_data_disk_attachment` resource with its own import ID. I added the missing import block and updated the explanation accordingly.
- The managed disk example used a hard-coded `create_option = "Empty"` without checking the existing disk. I changed the instructions to retrieve the managed disk's actual creation settings with `az disk show` and feed those values into the HCL.

## Review Notes
- The post now reflects that marketplace images with purchase plans may require a matching `plan` block, and custom images may require `source_image_id` instead of `source_image_reference`.
- The example still assumes a single NIC and a single data disk resource block. More complex VM topologies may require repeating the same import pattern for each attached resource.
- A live import was not executed in this environment because no Azure subscription context was available; validation was performed against official OpenTofu, Azure CLI, Azure REST, and AzureRM provider documentation.
