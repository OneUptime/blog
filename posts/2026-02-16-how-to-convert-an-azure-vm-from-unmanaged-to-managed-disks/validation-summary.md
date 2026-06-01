# Validation Summary: How to Convert an Azure VM from Unmanaged to Managed Disks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Managed Disks
- Azure unmanaged disks / VHD blobs
- Azure CLI
- Azure PowerShell Az.Compute
- Azure availability sets
- Azure Blob Storage

## Sources Consulted
- Microsoft Learn: Migrate unmanaged disks to managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/unmanaged-disks-deprecation
- Microsoft Learn: Convert unmanaged disks to managed disks for an Azure virtual machine: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/migrate-vm-unmanaged-to-managed-disks
- Microsoft Learn: Migrate a Windows virtual machine from unmanaged disks to managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/convert-unmanaged-to-managed-disks/
- Microsoft Learn: Azure CLI `az vm convert`: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm availability-set convert`: https://learn.microsoft.com/en-us/cli/azure/vm/availability-set?view=azure-cli-latest
- Microsoft Learn: Overview of Azure Managed Disks: https://learn.microsoft.com/en-us/azure/virtual-machines/managed-disks-overview
- Microsoft Learn: Convert managed disks storage between different disk types: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-convert-types
- Microsoft Learn: Azure CLI `az storage blob delete`: https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-lts
- Microsoft Learn: Az.Compute PowerShell module: https://learn.microsoft.com/powershell/module/az.compute

## Issues Found
- The post did not mention that Azure unmanaged disks were fully retired on March 31, 2026. Updated the introduction and conclusion so readers know unmanaged-disk VMs can no longer be started until migrated.
- Added the Microsoft-documented prerequisite that the VM should be healthy and extensions must be in `Provisioning succeeded` state before conversion.
- The availability-set conversion script used `az vm list --resource-group ... --query "[].id"`, which would deallocate, convert, and start every VM in the resource group, not only VMs in the target availability set. Updated the script to resolve the availability set ID and filter VMs by `availabilitySet.id`.
- The Premium SSD conversion example omitted the requirement that the VM size support Premium storage. Updated the text and added a resize step before changing the disk SKU.

## Review Notes
The main Azure CLI and PowerShell conversion commands are still documented and valid. Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
