# Validation Summary: How to Set Up Azure Cosmos DB Continuous Backup and Point-in-Time Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cosmos DB
- Azure Cosmos DB continuous backup
- Azure Cosmos DB periodic backup
- Point-in-time restore
- Azure CLI
- Azure Resource Manager SDK for .NET
- Bash

## Sources Consulted
- Microsoft Learn: Provision an Azure Cosmos DB account with continuous backup and point in time restore - https://learn.microsoft.com/en-us/azure/cosmos-db/provision-account-continuous-backup
- Microsoft Learn: Migrate an Azure Cosmos DB account from periodic to continuous backup mode - https://learn.microsoft.com/en-us/azure/cosmos-db/migrate-continuous-backup
- Microsoft Learn: Periodic backup and restore in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/periodic-backup-restore-introduction
- Microsoft Learn: Modify periodic backup interval and retention period in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/periodic-backup-modify-interval-retention
- Microsoft Learn: Restore a deleted container or database to the same Azure Cosmos DB account - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-restore-in-account-continuous-backup
- Microsoft Learn Azure CLI reference: az cosmosdb - https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn Azure CLI reference: az cosmosdb restorable-database-account - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/restorable-database-account
- Microsoft Learn Azure CLI reference: az cosmosdb sql - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql
- Microsoft Learn Azure CLI reference: az cosmosdb sql restorable-database - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/restorable-database
- Microsoft Learn Azure CLI reference: az cosmosdb sql restorable-container - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/restorable-container
- Microsoft Learn .NET API reference: ContinuousModeBackupPolicy.ContinuousModeTier - https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.cosmosdb.models.continuousmodebackuppolicy.continuousmodetier
- Microsoft Azure pricing: Azure Cosmos DB pricing - https://azure.microsoft.com/pricing/details/cosmos-db/

## Issues Found
- The periodic backup comparison described periodic backup as mainly useful for long-term archival. Azure Cosmos DB periodic backup retention is configurable but capped, so this was changed to describe configurable intervals, retention, and backup storage redundancy.
- The restore section implied disaster recovery always restores only to a new account. Full account point-in-time restore does create a new account, but Azure Cosmos DB also supports same-account restore for deleted databases and containers. The text was updated to distinguish those flows.
- The "What Gets Restored" section said all documents are restored. Microsoft documents that documents deleted because of expired TTL are not restored, so the restore list now includes that caveat.
- The scheduled restore test script claimed it counted documents and passed validation, but it only retrieved the restored account key. The comments and output were corrected so the script no longer claims data validation it does not perform.

## Review Notes
The Azure CLI commands and options shown in the post match the current Microsoft Learn Azure CLI reference. The local environment did not have the Azure CLI installed, so command verification was performed against official Microsoft Learn CLI documentation rather than local `az --help` output.
