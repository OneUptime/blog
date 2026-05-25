# Validation Summary: How to Create Azure Virtual Machines in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Machines
- Azure Virtual Networks, subnets, network interfaces, and public IPs
- Azure managed disks and data disk attachments
- Azure availability zones
- cloud-init custom data

## Sources Consulted
- HashiCorp Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform AzureRM `azurerm_linux_virtual_machine` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- HashiCorp Terraform AzureRM `azurerm_windows_virtual_machine` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/windows_virtual_machine
- HashiCorp Terraform AzureRM `azurerm_network_interface` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface
- HashiCorp Terraform AzureRM `azurerm_public_ip` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- HashiCorp Terraform AzureRM `azurerm_virtual_machine_data_disk_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_data_disk_attachment
- HashiCorp Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- HashiCorp Terraform strings and heredoc documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Microsoft Learn custom data and Azure Virtual Machines documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- Microsoft Learn Azure network interface and VM documentation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface-vm

## Issues Found
- The provider example pinned AzureRM `~> 3.0`, which is no longer the current major provider line. Updated it to `~> 4.0` and added an explicit `subscription_id` variable in the provider block, matching AzureRM v4 requirements.
- The SSH key examples used `file("~/.ssh/id_rsa.pub")`. Terraform does not perform shell expansion inside string literals; updated the examples to `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The availability-zone VM reused `azurerm_network_interface.linux_vm`, which was already attached to the first Linux VM. Added a dedicated `azurerm_network_interface.ha_server` resource and referenced it from the zone-specific VM.
- The Windows VM comment described `patch_mode = "AutomaticByPlatform"` as enabling automatic Windows updates. Updated the comment to describe it as platform-managed guest patching, which is more accurate for the AzureRM setting.

## Review Notes
- The custom data example correctly base64-encodes cloud-init content for Azure VM custom data.
- The public IP example correctly uses a Standard SKU with static allocation.
- Availability zone support depends on the selected Azure region and VM size; the examples are syntactically valid but production configurations should confirm regional zone availability before apply.
