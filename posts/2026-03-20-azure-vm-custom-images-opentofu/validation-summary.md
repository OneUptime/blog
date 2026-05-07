# Validation Summary: How to Use Custom Images for Azure VMs with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager provider (`azurerm`)
- Microsoft Azure Virtual Machines
- Azure Compute Gallery
- Azure managed images
- Azure CLI

## Sources Consulted
- AzureRM `azurerm_shared_image_gallery` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/shared_image_gallery
- AzureRM `azurerm_shared_image` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/shared_image
- AzureRM `azurerm_shared_image_version` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/shared_image_version
- AzureRM `azurerm_shared_image_version` data source docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/shared_image_version
- AzureRM `azurerm_linux_virtual_machine` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM `azurerm_image` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/image
- Microsoft Learn, "Deprovision or generalize a VM before creating an image": https://learn.microsoft.com/en-us/azure/virtual-machines/generalize
- Microsoft Learn, "Store and share images in an Azure Compute Gallery": https://learn.microsoft.com/en-us/azure/virtual-machines/shared-image-galleries
- Microsoft Learn, "Create a legacy managed image of a generalized VM in Azure": https://learn.microsoft.com/en-us/azure/virtual-machines/capture-image-resource
- Microsoft Learn, Azure CLI `az sig image-version`: https://learn.microsoft.com/en-us/cli/azure/sig/image-version?view=azure-cli-latest

## Issues Found
- The prerequisites were too narrow and implied a generalized VM was always required. I changed them to reflect current Azure Compute Gallery source options and removed the blanket generalization requirement because gallery images can also be created from specialized VMs.
- The shared image definition hardcoded `hyper_v_generation = "V2"` and `architecture = "x64"` as if they were universally correct. I changed both to variables because the image definition must match the source VM/image characteristics.
- The Step 2 comment said `managed_image_id` covered snapshots. I corrected the note to point snapshot-based versions to `os_disk_snapshot_id`, which is the documented argument for that source type.
- The `exclude_from_latest` comment contradicted the actual value in the snippet. I rewrote the comment so it matches the behavior shown in the code.
- The VM capture/generalization workflow was incomplete. I added the required Linux deprovision step and the required `az vm deallocate` command before `az vm generalize`.
- The post incorrectly said `az vm generalize` "destroys" the VM. I corrected that to the documented behavior: it is irreversible and the VM cannot be restarted afterward, but the command does not delete the VM resource.
- The conclusion said to always generalize before creating an image. I corrected that claim to distinguish between generalized images/legacy managed images and Azure Compute Gallery specialized images.

## Review Notes
- The post is technically valid after the fixes.
- Azure branding uses "Azure Compute Gallery", but the current AzureRM provider resource names remain `azurerm_shared_image_gallery`, `azurerm_shared_image`, and `azurerm_shared_image_version`.
- Current AzureRM 4.x docs state that the `latest` data source lookup does not return image versions excluded with `exclude_from_latest = true`; teams pinned to older 3.x provider versions should verify that behavior in their environment.
