# Validation Summary: How to Provision Ubuntu VMs with Terraform on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform AzureRM provider (hashicorp/azurerm ~> 3.90)
- Microsoft Azure (Resource Groups, Virtual Networks, Subnets, Public IPs, Network Security Groups, Network Interfaces, Linux Virtual Machines, Managed Disks)
- Ubuntu 22.04 LTS (Jammy)
- Azure CLI
- cloud-init
- APT package management on Debian/Ubuntu

## Sources Consulted
- Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
  - `azurerm_linux_virtual_machine`
  - `azurerm_public_ip`
  - `azurerm_managed_disk`
  - `azurerm_virtual_machine_data_disk_attachment`
  - `azurerm_network_interface_security_group_association`
- Terraform CLI commands: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform install docs: https://developer.hashicorp.com/terraform/install
- Microsoft Learn — Install Azure CLI on Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Canonical — Find Ubuntu images on Azure: https://documentation.ubuntu.com/azure/azure-how-to/instances/find-ubuntu-images/
- hashicorp/azurerm v3.90.0 release notes: https://github.com/hashicorp/terraform-provider-azurerm/releases/tag/v3.90.0
- HashiCorp blog — AzureRM 4.0 release: https://www.hashicorp.com/en/blog/terraform-azurerm-provider-4-0-adds-provider-defined-functions

## Issues Found
No technical issues found. Every code block and command was verified:

- Azure CLI install via `https://aka.ms/InstallAzureCLIDeb` — still functional.
- HashiCorp APT install commands (GPG dearmor, signed-by repository, `lsb_release -cs`) — syntactically and functionally correct.
- `azurerm` provider block with `features {}` — correct (required even when empty).
- Ubuntu 22.04 LTS Gen 2 image URN (`Canonical` / `0001-com-ubuntu-server-jammy` / `22_04-lts-gen2`) — matches Canonical's published Azure Marketplace identifiers.
- `azurerm_linux_virtual_machine` arguments (`disable_password_authentication`, `admin_ssh_key`, `os_disk`, `source_image_reference`, `custom_data`, `network_interface_ids`) — all valid.
- `azurerm_public_ip` with `sku = "Standard"` + `allocation_method = "Static"` — correct (Standard SKU requires Static allocation).
- `azurerm_virtual_machine_data_disk_attachment` (`managed_disk_id`, `virtual_machine_id`, `lun`, `caching`) — all required args present and correct.
- `azurerm_network_interface_security_group_association` — valid resource for attaching an NSG to a NIC.
- NSG rules with priorities 1001/1002 — within valid range (100–4096) and unique.
- cloud-init `runcmd` YAML with `- |` multi-line blocks — valid YAML and valid cloud-init syntax.
- `terraform output -raw <name>` — valid flag (Terraform ≥ 0.14).
- `terraform destroy -target <addr>` — valid syntax.
- `count` indexing pattern (`azurerm_network_interface.workers[count.index].id`) — correct.

## Review Notes
- **azurerm provider version**: The post pins to `~> 3.90`, which is valid but nearing end-of-life. AzureRM v4.0 was released August 2024 and is the current supported major version in 2026. The code in this post would work with v4 as well, though v4 requires `subscription_id` to be set explicitly in the provider block (or via the `ARM_SUBSCRIPTION_ID` environment variable). Updating to `~> 4.0` would be advisable for new deployments but is not strictly an error.
- **Azure CLI install URL**: `aka.ms/InstallAzureCLIDeb` still works as a redirect, but Microsoft's current Learn docs (May 2026) prefer the step-by-step APT setup using `/etc/apt/keyrings/microsoft.gpg`. The one-liner remains functional.
- **Ubuntu version**: The post targets Ubuntu 22.04 LTS (Jammy). Ubuntu 24.04 LTS (Noble) has been GA since April 2024 and is widely used by 2026; 22.04 remains in standard support until 2027 so this is still a valid choice.
- **Data disk device path**: The cloud-init script assumes the data disk appears at `/dev/sdc`. This is the typical default on Azure Gen 2 VMs (sda = OS, sdb = temp resource disk, sdc = first data disk), but for greater robustness `/dev/disk/azure/scsi1/lun0` (the by-path symlink) is more deterministic. The post's wait loop mitigates the race condition adequately.
- **`version = "latest"` on `source_image_reference`**: Works but pins drift over time. For production reproducibility, pinning to a specific image version is generally preferred — not a correctness issue.
