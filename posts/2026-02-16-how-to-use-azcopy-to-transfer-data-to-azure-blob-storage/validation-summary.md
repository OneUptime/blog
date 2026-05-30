# Validation Summary: How to Use AzCopy to Transfer Data to Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Azure Storage
- Azure Blob Storage
- AzCopy v10
- Microsoft Entra ID authentication
- Shared access signatures (SAS)
- Azure CLI authentication

## Sources Consulted
- Microsoft Learn: Get started with AzCopy - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10
- Microsoft Learn: AzCopy copy command reference - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy
- Microsoft Learn: AzCopy bench command reference - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-bench
- Microsoft Learn: AzCopy configuration settings - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-configuration-settings
- Microsoft Learn: Authorize AzCopy with a user identity - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-authorize-user-identity
- Microsoft Learn: Authorize AzCopy with a service principal - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-authorize-service-principal
- Microsoft Learn: Find errors and resume jobs by using log and plan files in AzCopy - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-configure
- Microsoft Learn: Synchronize with Azure Blob storage by using AzCopy - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize

## Issues Found
- The macOS install command downloaded the macOS package as a `.tar.gz` and extracted it with `tar`, but Microsoft documents macOS portable binaries as zip files. Changed the command to download `azcopy_darwin.zip` and extract it with `unzip`.
- The authentication section labeled `AZCOPY_AUTO_LOGIN_TYPE=AZCLI` as storage account key authentication. That variable reuses an active Azure CLI OAuth token. Renamed the section to Azure CLI Session and added `AZCOPY_TENANT_ID`.
- The post referred to "Azure AD" for current authentication terminology. Updated the heading and command comment to Microsoft Entra ID.
- The block-size example said the default is 8 MB for most scenarios. The AzCopy command reference states the default is automatically calculated based on file size. Updated the comment accordingly.
- The resume example omitted the SAS-token caveat. Microsoft documents that SAS tokens are not persisted, so SAS-authenticated jobs need fresh `--source-sas` and/or `--destination-sas` values when resumed. Added a concise example.
- The benchmarking example used `azcopy benchmark`, but the supported AzCopy subcommand is `azcopy bench`. Updated the text and command.

## Review Notes
The remaining commands and flags reviewed are consistent with the current AzCopy v10 documentation. The examples assume the user has authenticated with Microsoft Entra ID or has appended a valid SAS token where required.
