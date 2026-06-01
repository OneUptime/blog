# Validation Summary: How to Configure Azure Batch Pool with Custom VM Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Batch
- Azure Compute Gallery
- Azure CLI
- Azure Linux Agent
- Ubuntu VM images on Azure
- HashiCorp Packer azure-arm builder

## Sources Consulted
- Microsoft Learn: Use the Azure Compute Gallery to create a custom image pool - https://learn.microsoft.com/en-us/azure/batch/batch-sig-images
- Microsoft Learn: Choose VM sizes and images for pools - https://learn.microsoft.com/en-us/azure/batch/batch-pool-vm-sizes
- Microsoft Learn: Azure CLI `az batch pool` reference - https://learn.microsoft.com/en-us/cli/azure/batch/pool
- Microsoft Learn: Azure CLI `az sig image-version` reference - https://learn.microsoft.com/en-us/cli/azure/sig/image-version
- Microsoft Learn: Deprovision or generalize a VM before creating an image - https://learn.microsoft.com/en-us/azure/virtual-machines/generalize
- Microsoft Learn: Tutorial: Create a custom image of an Azure VM with the Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-custom-images
- Microsoft Learn: Update Batch pool properties - https://learn.microsoft.com/en-us/azure/batch/batch-pool-update-properties
- Canonical Ubuntu on Azure documentation: Find Ubuntu images on Azure - https://documentation.ubuntu.com/azure/azure-how-to/instances/find-ubuntu-images/
- HashiCorp Developer: Packer Azure ARM builder - https://developer.hashicorp.com/packer/integrations/hashicorp/azure/latest/components/builder/arm

## Issues Found
- The introduction said default marketplace images include the Batch node agent. Azure Batch documentation describes the VM image as providing the OS image and the Batch node agent SKU as the agent to be installed on nodes. Updated the wording to say Batch installs the matching node agent when the node joins the pool.
- The base VM and Packer examples used the older `Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest` image reference while the gallery image definition specified Hyper-V generation V2. Updated both examples to Canonical's current Ubuntu 22.04 LTS Gen2 server URN fields: `Canonical:ubuntu-22_04-lts:server:latest`.
- The Compute Gallery image version command used `--managed-image $VM_ID` while `$VM_ID` is a virtual machine resource ID. Updated the command to use `--virtual-machine $VM_ID`, matching the Azure CLI documentation for creating an image version from a VM.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI command validation was performed against current Microsoft Learn command reference pages rather than local `az --help` output.
- Azure Batch custom images from Azure Compute Gallery require Microsoft Entra authentication and appropriate access to the gallery image. The post mentions access checks in troubleshooting, but a future revision could call this out earlier as a prerequisite.
