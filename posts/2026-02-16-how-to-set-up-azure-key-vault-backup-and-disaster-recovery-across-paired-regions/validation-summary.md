# Validation Summary: How to Set Up Azure Key Vault Backup and Disaster Recovery Across Paired Regions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Key Vault
- Azure paired regions and Microsoft-managed failover
- Azure CLI
- Azure PowerShell Az modules
- Azure Blob Storage immutable storage
- Azure Automation
- Python Azure SDK

## Sources Consulted
- Microsoft Learn: Reliability in Azure Key Vault - https://learn.microsoft.com/en-us/azure/reliability/reliability-key-vault
- Microsoft Learn: Azure Key Vault backup and restore - https://learn.microsoft.com/en-us/azure/key-vault/general/backup
- Microsoft Learn: Azure Key Vault soft-delete overview - https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview
- Microsoft Learn: Azure CLI az keyvault reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Azure CLI az keyvault certificate reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Microsoft Learn: Azure CLI az storage container immutability-policy reference - https://learn.microsoft.com/en-us/cli/azure/storage/container/immutability-policy
- Microsoft Learn: Configure immutability policies for containers - https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-policy-configure-container-scope
- Microsoft Learn: Backup-AzKeyVaultSecret - https://learn.microsoft.com/en-us/powershell/module/az.keyvault/backup-azkeyvaultsecret
- Microsoft Learn: Backup-AzKeyVaultKey - https://learn.microsoft.com/en-us/powershell/module/az.keyvault/backup-azkeyvaultkey
- Microsoft Learn: Backup-AzKeyVaultCertificate - https://learn.microsoft.com/en-us/powershell/module/az.keyvault/backup-azkeyvaultcertificate
- Microsoft Learn: Azure Key Vault Python client library quickstart - https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python

## Issues Found
- Corrected the Key Vault regional failover explanation. Microsoft-managed failover is best-effort, may happen only after a prolonged outage, and the vault can be unavailable for hours before failover; it is not guaranteed by DNS TTL within minutes.
- Clarified that Microsoft-managed paired-region replication applies to most paired regions, with documented exceptions, rather than all paired regions.
- Corrected backup restore constraints from "same tenant and geography" to "same Azure subscription and geography" based on current Microsoft documentation.
- Corrected the accidental deletion explanation to account for soft-delete retention and purge behavior more accurately.
- Added the documented Key Vault backup limitation that objects with more than 500 past versions are not supported for backup.
- Fixed the immutable storage example so it locks the container immutability policy after creation. An unlocked time-based policy can be deleted or shortened, so it does not provide the protection claimed in the post.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output.
