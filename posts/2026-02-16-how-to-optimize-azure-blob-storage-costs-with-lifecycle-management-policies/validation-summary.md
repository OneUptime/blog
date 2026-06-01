# Validation Summary: How to Optimize Azure Blob Storage Costs with Lifecycle Management Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Blob Storage access tiers
- Azure Blob Storage lifecycle management policies
- Azure CLI
- Azure Monitor metrics
- Kusto Query Language (KQL)

## Sources Consulted
- Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure Blob Storage lifecycle management overview: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview
- Access tiers for blob data: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Rehydrate an archived blob to an online tier: https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-to-online-tier
- Azure CLI `az storage account blob-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Azure CLI `az storage blob set-tier`: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Azure CLI `az monitor metrics`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics

## Issues Found
- Clarified that listed storage prices are estimates and vary by Azure region, redundancy option, and operation type.
- Corrected the `LastAccessTime` explanation to note that it is updated by reads or writes, and that read updates are limited to the first read in a 24-hour period.
- Added a note that lifecycle policy `prefixMatch` values must include the container name.
- Clarified that `enableAutoTierToHotFromCool` does not avoid the first Cool-tier read charge; it reduces repeated Cool-tier read costs after data becomes active again.
- Corrected the high-priority archive rehydration claim to state that it may complete in under 1 hour for blobs under 10 GB, instead of implying that all high-priority rehydration completes within an hour.
- Replaced the claim that lifecycle policies run once per day with the official behavior: policies run periodically, and new or edited rules can take up to 24 hours to go into effect and start their first execution.

## Review Notes
- The Azure CLI commands and lifecycle management JSON structure are consistent with current official documentation.
- The Cold tier requires Azure CLI 2.50.0 or later when setting tiers manually. The post does not pin CLI versions, but the examples use current commands.
