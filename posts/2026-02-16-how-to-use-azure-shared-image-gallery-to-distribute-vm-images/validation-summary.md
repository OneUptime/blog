# Validation Summary: How to Use Azure Shared Image Gallery to Distribute VM Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Compute Gallery (formerly Shared Image Gallery)
- Azure CLI
- Azure Virtual Machines
- Azure VM Image Builder
- Azure Resource Graph
- Azure RBAC

## Sources Consulted
- Microsoft Learn: Azure Compute Gallery overview - https://learn.microsoft.com/en-us/azure/virtual-machines/azure-compute-gallery
- Microsoft Learn: Create a gallery for sharing resources - https://learn.microsoft.com/en-us/azure/virtual-machines/create-gallery
- Microsoft Learn: Azure CLI `az sig` reference - https://learn.microsoft.com/en-us/cli/azure/sig
- Microsoft Learn: Azure CLI `az sig share` reference - https://learn.microsoft.com/en-us/cli/azure/sig/share
- Microsoft Learn: Azure CLI `az sig image-version` reference - https://learn.microsoft.com/en-us/cli/azure/sig/image-version
- Microsoft Learn: Azure CLI `az sig image-definition` reference - https://learn.microsoft.com/en-us/cli/azure/sig/image-definition
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Create a VM from a generalized image in a gallery - https://learn.microsoft.com/en-us/azure/virtual-machines/vm-generalized-image-version
- Microsoft Learn: Share Azure Compute Gallery resources with a community gallery - https://learn.microsoft.com/en-us/azure/virtual-machines/share-gallery-community
- Microsoft Learn: Azure VM Image Builder JSON template reference - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/image-builder-json
- Microsoft Learn: Gallery Image Versions REST API - https://learn.microsoft.com/en-us/rest/api/compute/gallery-image-versions/create-or-update

## Issues Found
- The image version creation command captured a VM resource ID but passed it to `--managed-image`. Azure CLI uses `--virtual-machine` for VM source IDs and `--managed-image` for managed image names or IDs, so the command was corrected to use `--virtual-machine $SOURCE_VM_ID`.
- The image version update command used `--end-of-life-date`, which is available on create but not as a direct update parameter in the current CLI reference. It was changed to update the same property via `--set publishingProfile.endOfLifeDate=2026-06-01T00:00:00+00:00`.
- The community gallery command passed publisher metadata flags to `az sig share enable-community`, but those flags belong to `az sig create` or `az sig update`. The example now configures the gallery with `az sig update --permissions Community ...` and then runs `az sig share enable-community`.
- The Image Builder template used `replicationRegions`, which Microsoft documents as deprecated for gallery distribution. It was replaced with the current `targetRegions` array format.
- The cost section said replication itself is free and only storage is charged. Microsoft documents network egress charges for replication of the first copy from the source region to additional regions, so the cost explanation was corrected.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against current official Microsoft Learn CLI and Azure Compute Gallery documentation rather than local `az --help` output.
