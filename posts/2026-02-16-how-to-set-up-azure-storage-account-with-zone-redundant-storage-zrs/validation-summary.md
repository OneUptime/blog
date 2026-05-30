# Validation Summary: How to Set Up Azure Storage Account with Zone-Redundant Storage (ZRS)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Zone-Redundant Storage (ZRS)
- Locally Redundant Storage (LRS)
- Geo-Redundant Storage (GRS)
- Geo-Zone-Redundant Storage (GZRS and RA-GZRS)
- Azure CLI
- AzCopy
- Azure Blob Storage Python SDK
- Azure Monitor metric alerts

## Sources Consulted
- Azure Storage data redundancy: https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy
- Change how a storage account is replicated: https://learn.microsoft.com/en-us/azure/storage/common/redundancy-migration
- Create an Azure storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure CLI `az storage account migration`: https://learn.microsoft.com/en-us/cli/azure/storage/account/migration
- Azure CLI `az storage account blob-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Azure CLI `az monitor metrics alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- AzCopy copy reference: https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy

## Issues Found
- The post overstated ZRS failover behavior as "no downtime" during a single zone failure. Azure documents that data remains accessible for reads and writes when a zone is unavailable, but DNS repointing and transient errors can still affect applications. Updated the language to describe zone-level availability and transient-error handling more accurately.
- The redundancy comparison table described GZRS as "3+1", which could imply only one secondary copy. Azure documents that GZRS uses ZRS in the primary region and LRS in the secondary region, for six total copies. Updated the table to describe the replication layout instead of ambiguous zone counts.
- The migration section said Azure CLI does not support live migration requests and showed `az storage account update --sku Standard_ZRS` for an in-place LRS-to-ZRS change. Current Azure documentation uses `az storage account migration start --sku Standard_ZRS` for locally redundant to zone-redundant conversion. Replaced the outdated guidance with the supported migration command and status command.
- The post stated live migration is only available for Standard storage accounts, not Premium. Current Azure documentation indicates premium file share accounts support conversion, while premium block blob accounts require manual migration. Updated the limitation accordingly.
- The SLA discussion implied LRS zone-failure downtime as a certainty. Updated the wording to say ZRS is designed for better resilience during zone-level failures that could affect LRS accounts.

## Review Notes
Azure pricing is presented as approximate and subject to change, which is appropriate for a blog post. The Azure CLI examples could not be executed locally because the Azure CLI is not installed in this environment, so command validation was performed against current Microsoft Learn CLI documentation.
