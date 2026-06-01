# Validation Summary: How to Encrypt Azure Managed Disks with Customer-Managed Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Disks
- Azure Disk Storage server-side encryption
- Customer-managed keys
- Disk encryption sets
- Azure Key Vault
- Azure Key Vault Managed HSM
- Azure CLI
- Azure PowerShell

## Sources Consulted
- Microsoft Learn: Server-side encryption of Azure Disk Storage, https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Microsoft Learn: Use the Azure CLI to enable server-side encryption with customer-managed keys for managed disks, https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-enable-customer-managed-keys-cli
- Microsoft Learn: az disk-encryption-set CLI reference, https://learn.microsoft.com/en-us/cli/azure/disk-encryption-set
- Microsoft Learn: New-AzDiskEncryptionSetConfig PowerShell reference, https://learn.microsoft.com/en-us/powershell/module/az.compute/new-azdiskencryptionsetconfig
- Microsoft Learn: New-AzDiskConfig PowerShell reference, https://learn.microsoft.com/en-us/powershell/module/az.compute/new-azdiskconfig
- Microsoft Learn: Azure Key Vault RBAC guide, https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found
- The CMK description said Azure uses the customer-managed key to encrypt and decrypt disk data directly. Updated it and the storage-layer explanation to describe Azure Managed Disks envelope encryption: the disk data is encrypted with a DEK, and the customer-managed key protects that DEK.
- The key verification command labeled `key.n` as `keySize`. `key.n` is the RSA modulus, not the key size. Updated the query to show the key ID and key type instead.
- The double encryption example reused a disk encryption set created with `EncryptionAtRestWithCustomerKey`. Azure fixes the encryption type on the disk encryption set, so a double-encrypted disk needs a disk encryption set created with `EncryptionAtRestWithPlatformAndCustomerKeys`. Updated the example to create and use a separate double-encryption disk encryption set.
- The conclusion said customer-managed keys give full control over disk encryption. Updated it to the more precise claim that CMKs give control over the keys protecting disk encryption keys.

## Review Notes
- Azure CLI was not installed in the local workspace, so CLI syntax was verified against current Microsoft Learn CLI reference pages instead of local `az --help` output.
- The post intentionally uses Key Vault access policies in the main flow and includes an RBAC alternative. Both permission models are valid, but future revisions could use variables for the Key Vault resource ID to make the RBAC example easier to run.
