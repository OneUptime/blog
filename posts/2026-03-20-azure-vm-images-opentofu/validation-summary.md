# Validation Summary: How to Create Azure VM Images with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- AzAPI provider
- Azure Virtual Machines
- Azure Managed Images
- Azure Compute Gallery
- Azure VM Image Builder
- Azure CLI

## Sources Consulted
- HashiCorp AzureRM provider docs: `azurerm_image`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/image.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_snapshot`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/snapshot.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_managed_disk`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/managed_disk.html.markdown
- Microsoft Learn: Remove machine-specific information by deprovisioning or generalizing a VM before creating an image: https://learn.microsoft.com/en-us/azure/virtual-machines/generalize
- Microsoft Learn: Create a legacy managed image in Azure: https://learn.microsoft.com/en-us/azure/virtual-machines/capture-image-resource
- Microsoft Learn: Azure VM Image Builder overview: https://learn.microsoft.com/en-us/azure/virtual-machines/image-builder-overview
- Microsoft Learn: `Microsoft.VirtualMachineImages/imageTemplates` AzAPI reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.virtualmachineimages/imagetemplates
- Microsoft Learn: `Microsoft.Compute/images` template and API reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/2023-09-01/images
- Microsoft Learn: Azure Compute REST API `Images - Create Or Update`: https://learn.microsoft.com/en-us/rest/api/compute/images/create-or-update?view=rest-compute-2025-11-01
- Microsoft Learn: Azure CLI `az image builder`: https://learn.microsoft.com/en-us/cli/azure/image/builder?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az sig image-version`: https://learn.microsoft.com/en-us/cli/azure/sig/image-version?view=azure-cli-latest
- Microsoft Learn: Share VM images in an Azure Compute Gallery: https://learn.microsoft.com/en-us/azure/virtual-machines/shared-image-galleries

## Issues Found
- The introduction described Azure VM images as generalized snapshots. I corrected that wording because Azure supports both generalized and specialized image workflows, and Microsoft’s current documentation treats managed images as the simpler legacy image form.
- The Step 1 generalization flow skipped VM deallocation before `az vm generalize`. I added `az vm deallocate` because Microsoft documents deallocation as a required step before generalizing a VM.
- The Step 2 `azurerm_image` example omitted the required `storage_type` fields in both the `os_disk` and `data_disk` blocks. I added them to match the current AzureRM provider schema.
- The Step 2 image-from-snapshot example passed snapshot IDs directly into `managed_disk_id`. I changed the flow to restore managed disks from the snapshots first and then create the image from those managed disks, because the AzureRM `azurerm_image` resource exposes `managed_disk_id`, while Azure’s image API treats snapshots and managed disks as distinct source types.
- The Step 3 example used `azurerm_image_builder_template`, which is not a current AzureRM resource. I replaced it with the supported `azapi_resource` form for `Microsoft.VirtualMachineImages/imageTemplates`.
- The Step 3 distribution example effectively used the older replication-region pattern. I updated it to `targetRegions`, which is the current non-deprecated distribution shape in the Image Templates AzAPI reference.
- The Step 3 example referenced an undefined `azurerm_shared_image.app.id`. I replaced that with `var.gallery_image_id` so the snippet cleanly targets an existing Azure Compute Gallery image definition without inventing an undeclared resource.
- The Step 4 command sequence listed images with `az image list`, which would not show Azure Compute Gallery image versions created by the corrected Image Builder flow. I changed it to `az sig image-version list` and added `az image builder wait` so the end-to-end CLI flow matches the gallery-based distribution target.
- The prerequisites were missing the Azure resource-provider registration requirement for Azure VM Image Builder. I added the required provider-registration note from Microsoft’s Image Builder guidance.

## Review Notes
- Microsoft’s current documentation refers to managed images as legacy managed images and generally recommends Azure Compute Gallery for newer multi-region, versioned image pipelines.
- The post now mixes `azurerm` and `azapi` intentionally. That is technically appropriate here because Azure VM Image Builder templates are represented as `Microsoft.VirtualMachineImages/imageTemplates`, and the current official Azure template reference documents them through AzAPI.
- Step 2 still assumes the source snapshot came from a generalized Linux OS disk. If a reader is working from a specialized source instead, `os_state` would need to be `Specialized` rather than `Generalized`.
