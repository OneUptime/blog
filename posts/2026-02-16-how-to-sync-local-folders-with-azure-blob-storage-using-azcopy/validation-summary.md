# Validation Summary: How to Sync Local Folders with Azure Blob Storage Using AzCopy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- AzCopy v10
- AzCopy sync, copy, login, and jobs commands
- SAS tokens
- Microsoft Entra service principals
- Managed identities
- Cron, Windows Task Scheduler, and systemd timers

## Sources Consulted
- Microsoft Learn: Synchronize with Azure Blob storage by using AzCopy v10 - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize
- Microsoft Learn / AzCopy reference: azcopy sync - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-sync
- Microsoft Learn: Authorize access for AzCopy with a service principal - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-authorize-service-principal
- Microsoft Learn: AzCopy v10 configuration settings - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-configuration-settings
- Microsoft Learn: Find errors and resume jobs with logs in AzCopy - https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-configure
- Microsoft Learn: Troubleshoot issues in AzCopy v10 - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-storage/blobs/connectivity/storage-use-azcopy-troubleshoot

## Issues Found
- Corrected the default sync comparison description. The post said AzCopy compares last modified time and file size by default; Microsoft documentation describes the default comparison as file names and last modified timestamps.
- Corrected the generic description of default sync behavior. The post said sync only uploads by default, but sync can upload or download depending on source and destination; it transfers from source to destination.
- Updated the service principal automation example to use `AZCOPY_AUTO_LOGIN_TYPE=SPN` with the service principal environment variables. This matches Microsoft's documented non-interactive environment-variable flow and avoids relying on `azcopy login` storing credentials in a local secret store.
- Corrected the dry-run section. The post said AzCopy does not have a native dry-run flag, then immediately used `--dry-run`; current AzCopy sync documentation includes `--dry-run`.
- Corrected the conflict-handling explanation. The post said the source overwrites the destination when both sides change; with default timestamp comparison, the source transfers only if it is newer, and a newer destination is skipped.

## Review Notes
AzCopy was not installed in the local environment, so CLI behavior was verified against current Microsoft Learn documentation rather than local `azcopy --help` output. The remaining commands and flags reviewed are consistent with the cited AzCopy v10 documentation.
