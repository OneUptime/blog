# Validation Summary: How to Fix Azure Disk Encryption Errors on Windows and Linux Virtual Machines

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Disk Encryption
- Azure Virtual Machines
- Azure Key Vault
- Azure CLI
- BitLocker
- dm-crypt/LUKS
- Azure VM repair extension
- Azure Managed Disks server-side encryption
- Encryption at host
- Confidential disk encryption

## Sources Consulted
- Microsoft Learn: Azure Disk Encryption for Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disk-encryption-overview
- Microsoft Learn: Azure Disk Encryption for Windows VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/disk-encryption-overview
- Microsoft Learn: Azure Disk Encryption troubleshooting guide for Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disk-encryption-troubleshooting
- Microsoft Learn: Azure Disk Encryption troubleshooting guide for Windows VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/disk-encryption-troubleshooting
- Microsoft Learn: Troubleshoot Linux VM boot failure after enabling Azure Disk Encryption: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-vm-boot-failure-after-enabling-azure-disk-encryption
- Microsoft Learn Azure CLI reference: az vm encryption: https://learn.microsoft.com/en-us/cli/azure/vm/encryption
- Microsoft Learn Azure CLI reference: az vm repair: https://learn.microsoft.com/en-us/cli/azure/vm/repair
- Microsoft Learn: Configure network security for Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Microsoft Learn: Create and configure a key vault for Azure Disk Encryption on a Windows VM: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/disk-encryption-key-vault
- Microsoft Learn: BitLocker overview: https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/
- Microsoft Learn: Server-side encryption of Azure Disk Storage: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Microsoft Learn: Overview of managed disk encryption options: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption-overview

## Issues Found
- Added the September 15, 2028 Azure Disk Encryption retirement notice and migration context, because current Microsoft Learn documentation warns that ADE-enabled workloads must move before retirement.
- Corrected the Key Vault prerequisite language. Soft-delete is required for pre-existing vaults, while purge protection is recommended rather than listed as a strict ADE prerequisite. The current ADE release also does not require Microsoft Entra service-principal parameters for new VMs.
- Corrected VM size and memory requirements. Linux data-volume-only encryption requires at least 2 GB, while OS plus data-volume encryption requires at least 8 GB or about twice root filesystem usage for larger roots.
- Corrected OS compatibility language. Debian 10+ is not in the current Microsoft ADE-supported Linux image table, so the post now refers readers to selected supported Azure-endorsed images instead of broad distro version claims.
- Replaced unsafe guidance to remove and reinstall a stuck ADE extension after one hour. Microsoft documents Linux OS encryption as taking 3 to 16 hours and recommends restoring from backup when OS encryption fails; extension removal should follow encryption disablement for data-disk-only cases.
- Corrected the VM repair command for encrypted disks by adding `--unlock-encrypted-vm`.
- Corrected the Windows BitLocker protector explanation. ADE uses the BitLocker external key protector for Windows VMs, not TPM-only mode.
- Removed unsupported fixed free-space and data-disk-size claims for data disk encryption failures, and replaced them with documented filesystem, mount, and resize checks.
- Corrected the encryption status description to align with `az vm encryption show` output and Microsoft guidance that Azure disk encryption settings can be stamped before guest-level encryption fully completes.

## Review Notes
Azure CLI was not installed in the local environment, so command syntax was verified against the official Azure CLI reference instead of local `az --help` output.
