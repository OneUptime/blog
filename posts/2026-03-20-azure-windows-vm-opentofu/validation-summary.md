# Validation Summary: How to Create Windows Virtual Machines with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual Machines
- AzureRM provider
- Azure Network Security Groups
- Azure Bastion
- Azure CLI
- Windows Server
- Azure Custom Script Extension

## Sources Consulted
- HashiCorp AzureRM provider: `azurerm_windows_virtual_machine` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/windows_virtual_machine
- HashiCorp AzureRM provider: `azurerm_network_security_group` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- HashiCorp AzureRM provider: `azurerm_network_interface_security_group_association` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface_security_group_association
- HashiCorp AzureRM provider: `azurerm_virtual_machine_extension` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension
- HashiCorp AzureRM provider: `azurerm_managed_disk` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_disk
- HashiCorp AzureRM provider: `azurerm_virtual_machine_data_disk_attachment` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_data_disk_attachment
- Microsoft Learn: Automatic Guest Patching for Azure Virtual Machines and Scale Sets https://learn.microsoft.com/en-us/azure/virtual-machines/automatic-vm-guest-patching
- Microsoft Learn: Azure Custom Script Extension for Windows https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows
- Microsoft Learn: Configure NSG rules for Azure Bastion https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Microsoft Learn: Connect to a Windows VM using RDP - Azure Bastion https://learn.microsoft.com/en-us/azure/bastion/bastion-connect-vm-rdp-windows
- Microsoft Learn: Azure CLI `az network bastion` https://learn.microsoft.com/en-us/cli/azure/network/bastion?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm` https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest

## Issues Found
- The description claimed the post covered WinRM configuration and PowerShell DSC extensions, but the body actually covers RDP access controls, managed disks, and the Custom Script Extension. I updated the description to match the implementation shown.
- The inbound NSG example only allowed RDP from `var.admin_cidr`, which conflicts with the later Azure Bastion guidance because Bastion reaches target VMs from private network addresses on the Bastion subnet. I changed the rule to use `source_address_prefixes` so the example can include both private admin/VPN ranges and the AzureBastionSubnet CIDR.
- The deployment section used `tofu output -raw private_ip_address`, but the post never defines an `output` block with that name. I replaced it with the documented Azure CLI `az vm list-ip-addresses` command.
- The Key Vault guidance implied that moving `admin_password` out of code was sufficient. The AzureRM provider stores VM admin credentials in state, so I updated the comment and conclusion to note the need to secure OpenTofu state as well.
- The conclusion said `patch_mode = "AutomaticByPlatform"` respects maintenance windows. Azure-managed patching is correct, but custom maintenance windows are handled through Azure Update Manager. I updated the wording accordingly.

## Review Notes
- The VM image SKU `2022-datacenter-azure-edition` appears in Microsoft's supported image list for `AutomaticByPlatform`, so the patching example is valid as written.
- The VM already has a system-assigned identity. A future revision could replace storage account keys in the Custom Script Extension with `managedIdentity` for blob downloads, which Microsoft documents for Custom Script Extension 1.10 and later.
