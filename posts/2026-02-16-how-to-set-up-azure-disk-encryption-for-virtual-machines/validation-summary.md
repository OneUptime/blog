# Validation Summary: How to Set Up Azure Disk Encryption for Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Disk Encryption
- Azure Virtual Machines
- Azure Key Vault
- Azure CLI
- BitLocker
- dm-crypt
- Azure Policy
- Encryption at host

## Sources Consulted
- Microsoft Learn: Azure Disk Encryption scenarios on Linux VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disk-encryption-linux
- Microsoft Learn: Create and configure a key vault for Azure Disk Encryption on a Windows VM - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/disk-encryption-key-vault
- Microsoft Learn: az vm encryption Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/vm/encryption?view=azure-cli-latest
- Microsoft Learn: Migrate from Azure Disk Encryption to encryption at host - https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption-migrate
- Microsoft Learn: Azure Policy built-in definitions for Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/policy-reference
- Azure Policy GitHub built-in definitions for LinuxVMEncryption_AINE and WindowsVMEncryption_AINE - https://github.com/Azure/azure-policy

## Issues Found
- Added the Azure Disk Encryption retirement warning. Microsoft documents ADE retirement on September 15, 2028 and recommends encryption at host for new VMs.
- Corrected prerequisites. The original text overstated managed-disk support as a simple requirement and omitted the required backup/snapshot guidance for managed disk VMs, current unsupported VM series, and same-tenant Key Vault requirement.
- Corrected the encryption-options comparison. Azure has several managed disk encryption options, not only SSE and ADE, and SSE can use customer-managed keys through Disk Encryption Sets but does not cover temporary disks or disk caches by itself.
- Corrected Linux operational notes. OS encryption is not just a reboot requirement; Microsoft states encryption or disabling encryption may cause reboots, Linux OS encryption can temporarily put the VM in a servicing state, and data volumes are unusable while encryption is in progress.
- Replaced the broad Linux distribution version list with a pointer to the official supported operating systems list because support is limited to specific Azure-endorsed images and versions.
- Added the Windows volume-type caveat. Windows ADE supports OS-only or OS plus data disks, not data-only encryption.
- Corrected KEK rotation guidance. ADE does not automatically follow Azure Key Vault key auto-rotation, and Linux examples should use the versioned KEK URL.
- Replaced the deprecated Azure Policy definition ID with the current Linux and Windows built-in policy IDs that audit VMs missing ADE or encryption at host.
- Tightened troubleshooting guidance for Key Vault permission errors, including Key Vault firewall trusted services and caller permissions.
- Updated VM-size troubleshooting and conclusion text to reflect ADE retirement and current unsupported VM families.

## Review Notes
The Azure CLI commands and flags used by the post are current according to the Azure CLI reference. The examples use friendly Key Vault names where Azure CLI permits names, but production automation should prefer full resource IDs or explicit versioned KEK URLs where Microsoft documents them.
