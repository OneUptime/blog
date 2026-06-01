# Validation Summary: How to Copy Data Between Two Azure Storage Accounts Using AzCopy

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Azure Storage
- Azure Blob Storage
- AzCopy v10
- Azure CLI
- Shared Access Signatures (SAS)
- Microsoft Entra ID / Azure AD authorization

## Sources Consulted
- Microsoft Learn: Copy blobs between Azure storage accounts by using AzCopy - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-copy
- Microsoft Learn: AzCopy copy reference - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy
- Microsoft Learn: AzCopy sync reference - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-sync
- Microsoft Learn: Use AzCopy to copy blobs between storage accounts with network restrictions - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/connectivity/copy-blobs-between-storage-accounts-network-restriction
- Microsoft Learn: Copy Blob REST API authorization and SAS permissions - https://learn.microsoft.com/en-us/rest/api/storageservices/copy-blob
- Microsoft Learn: Use Azure CLI to create a user delegation SAS - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-user-delegation-sas-create-cli
- Microsoft Learn: Manage blob containers using Azure CLI - https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli

## Issues Found
- The post stated that AzCopy falls back to downloading and re-uploading when server-side copy is not possible. Updated this to explain that AzCopy reports the failure and the user must fix network/authorization configuration or perform a separate download and upload.
- The post stated that `azcopy sync` compares blobs by timestamp and size. Updated this to last-modified time by default, matching the AzCopy sync reference.
- The post stated that blob tags are preserved by default and used `--s2s-preserve-access-tier=true` as an additional preservation step. Updated this to note that properties, metadata, and access tier are preserved by default, while blob index tags require `--s2s-preserve-blob-tags=true`.
- The post used `--s2s-detect-source-changed=true` to "force client-side copy." That flag only detects source changes during service-to-service copies. Replaced the example with explicit download and upload commands for a client-side transfer.

## Review Notes
Azure CLI and AzCopy were not installed in the local environment, so commands were validated against current Microsoft Learn and AzCopy reference documentation rather than local `--help` output.
