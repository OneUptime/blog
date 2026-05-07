# Validation Summary: How to Create Linux Virtual Machines with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AzureRM provider
- Azure Linux Virtual Machines
- Azure networking (network interfaces, public IPs, network security groups)
- Azure managed disks
- cloud-init
- SSH
- Azure managed identity

## Sources Consulted
- OpenTofu `output` command docs: https://opentofu.org/docs/cli/commands/output/
- OpenTofu output values docs: https://opentofu.org/docs/v1.9/language/values/outputs/
- OpenTofu `pathexpand` function docs: https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu source for filesystem functions (`file` expands `~`): https://raw.githubusercontent.com/opentofu/opentofu/main/internal/lang/funcs/filesystem.go
- AzureRM `azurerm_linux_virtual_machine` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM `azurerm_virtual_machine_data_disk_attachment` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_data_disk_attachment
- AzureRM `azurerm_network_security_group` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- AzureRM `azurerm_public_ip` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Azure public IP documentation: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Azure NSG behavior documentation: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Azure Linux VM SSH connection documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux-vm-connect
- Azure custom data documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/custom-data
- Azure cloud-init overview: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init
- cloud-init wait behavior: https://cloudinit.readthedocs.io/en/latest/howto/wait_for_cloud_init.html
- Azure managed identity for VMs: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-configure-managed-identities

## Issues Found
- The introduction overstated the scope of `azurerm_linux_virtual_machine` by implying that the single resource directly covers NICs, data disks, and VM extensions. I changed that line to refer to `azurerm_linux_virtual_machine` together with related AzureRM resources, which matches the provider model.
- The networking example attached a Standard public IP but did not include a network security group. Azure documents Standard public IPs as secure by default, so SSH access would not work as written. I added an NSG with an inbound SSH rule and associated it to the NIC.
- The deploy section used `tofu output -raw public_ip_address` without defining a corresponding output. I added an `output "public_ip_address"` block so the command works.
- The cloud-init verification command used a placeholder IP and a non-blocking status check. I updated it to reuse the defined output and `cloud-init status --wait` so the command reliably waits for provisioning to finish.
- The conclusion included an Azure-specific statement about SSH agent forwarding that was broader than the platform documentation reviewed here supports. I replaced it with accurate guidance about pairing Standard public IPs with explicit NSG rules.

## Review Notes
- The Ubuntu Jammy Gen2 image reference `Canonical:0001-com-ubuntu-server-jammy:22_04-lts-gen2:latest` is still valid as of May 7, 2026.
- The local environment used for this review did not have the `tofu` binary installed, so CLI syntax was validated against official OpenTofu documentation rather than by executing the commands locally.
