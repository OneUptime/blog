# Validation Summary: How to Use Packer-Built Images in OpenTofu on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Packer (azure-arm builder)
- Packer Azure plugin v2.x
- OpenTofu / Terraform
- Terraform azurerm provider (`azurerm_image` data source, `azurerm_linux_virtual_machine_scale_set`, `azurerm_shared_image_gallery`, `azurerm_shared_image`, `azurerm_shared_image_version`)
- Azure Managed Images
- Azure Compute Gallery (Shared Image Gallery)
- Azure VM Scale Sets (VMSS)
- Ubuntu 22.04 LTS (Jammy) marketplace image

## Sources Consulted
- [Packer Azure Builder (azure-arm) docs](https://developer.hashicorp.com/packer/integrations/hashicorp/azure/latest/components/builder/arm)
- [Packer Azure plugin v2 announcement](https://www.hashicorp.com/en/blog/version-2-packer-azure-plugin-now-available)
- [hashicorp/packer-plugin-azure GitHub](https://github.com/hashicorp/packer-plugin-azure)
- [Terraform azurerm_image data source source](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/image.html.markdown)
- [Terraform azurerm_linux_virtual_machine_scale_set source](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/linux_virtual_machine_scale_set.html.markdown)
- [Terraform Registry — azurerm_linux_virtual_machine_scale_set](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set)

## Issues Found
1. **Invalid Packer azure-arm source parameters when using managed images.** The original `source "azure-arm"` block contained two top-level parameters that are not valid in this configuration:
   - `storage_account_name = "packerimagestorage"` — this is not a valid parameter name in the Packer azure-arm builder. The closest real parameter is `storage_account`, but it is only used when producing VHD output, not Managed Images.
   - `resource_group_name = "packer-images-rg"` — this top-level argument is for the VHD output path and conflicts with `managed_image_resource_group_name`. When building a Managed Image you should use `managed_image_resource_group_name` (already present) and rely on `location` (already present) for Packer to provision a temporary build resource group, or use `build_resource_group_name` / `temp_resource_group_name`.
   
   Both lines were removed. The remaining `managed_image_resource_group_name` and `managed_image_name` are the correct and sufficient outputs for a Managed Image build.

## Review Notes
- The `azurerm_image` data source's `name_regex` + `sort_descending` pattern is valid; note that sorting is lexicographic, so a name scheme like `web-server-1.10.0` and `web-server-1.9.0` will sort `1.9.0` after `1.10.0` — zero-pad version numbers if you rely on this for "latest".
- The Linux generalization command (`/usr/sbin/waagent -force -deprovision+user && export HISTSIZE=0 && sync`) matches the official guidance.
- Plugin pinning with `version = ">= 2.0.0"` is valid; the upstream README currently recommends `>= 2.6.0`, so consumers may want to bump the floor over time.
- `azurerm_shared_image_version` accepts the special string `"latest"` as `name`, so the gallery data source example is correct.
- The `azurerm_linux_virtual_machine_scale_set` resource arguments used (`instances`, `source_image_id`, `admin_ssh_key`, `os_disk`, `network_interface` / `ip_configuration`, `upgrade_mode = "Rolling"`, `rolling_upgrade_policy` with all four sub-fields) all match the current azurerm provider schema.
