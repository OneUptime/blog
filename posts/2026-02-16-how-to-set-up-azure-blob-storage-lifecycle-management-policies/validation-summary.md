# Validation Summary: How to Set Up Azure Blob Storage Lifecycle Mgmt Policies to Auto Tier and

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Blob Storage lifecycle management policies
- Azure CLI
- Azure Resource Manager / Bicep
- Azure Monitor
- Azure Event Grid

## Sources Consulted
- Azure Blob Storage lifecycle management overview: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview
- Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Configure a lifecycle management policy: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure
- Monitor lifecycle management policy runs: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-monitor
- Azure Blob Storage access tiers overview: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Azure CLI `az storage account management-policy` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- ARM/Bicep reference for `Microsoft.Storage/storageAccounts/managementPolicies`: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-04-01/storageaccounts/managementpolicies
- Azure Blob Storage Event Grid schema: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage

## Issues Found
- The lifecycle policy `prefixMatch` examples used folder-like values such as `logs/` without making clear that Azure requires lifecycle prefixes to start with a container name. Updated the policy JSON and examples to use prefixes like `app-data/logs/`.
- The prefix filtering explanation said `logs/2024/` would target a path. Updated it to explain that lifecycle prefixes must begin with the container name, for example `app-data/logs/2024/`.
- The monitoring section referred to `BlobTierChanged` and `BlobDeleted` as diagnostic log events. Updated it to recommend the lifecycle-specific `LifecyclePolicyCompleted` Event Grid event and Azure Monitor metrics/resource logs filtered for lifecycle `SetBlobTier` and `DeleteBlob` operations with lifecycle scanner user agents.

## Review Notes
- Azure CLI is not installed in this environment, so command verification was done against Microsoft Learn CLI documentation rather than local `az --help` output.
- The Bicep and JSON policy shapes match the documented lifecycle management schema. The post uses API version `2023-01-01`, which remains listed in the ARM/Bicep reference, though newer API versions are available.
