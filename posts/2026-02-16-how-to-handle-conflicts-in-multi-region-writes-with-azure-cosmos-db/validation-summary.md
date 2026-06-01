# Validation Summary: How to Handle Conflicts in Multi-Region Writes with Azure Cosmos DB

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB multi-region writes
- Azure Cosmos DB conflict resolution policies
- Azure CLI
- Azure Cosmos DB .NET SDK v3
- JavaScript stored procedures
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Conflict types and resolution policies when using multiple write regions - https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies
- Microsoft Learn: Manage conflict resolution policies in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-conflicts
- Microsoft Learn: Configure multi-region writes in applications that use Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/how-to-multi-master
- Microsoft Learn: Azure CLI `az cosmosdb sql container create` reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container
- Microsoft Learn: Azure Cosmos DB monitoring data reference - https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference
- Microsoft Learn: Diagnose and troubleshoot Azure Cosmos DB conflict exceptions - https://learn.microsoft.com/en-us/azure/cosmos-db/troubleshoot-conflict

## Issues Found
- The Azure CLI examples used non-current split flags such as `--conflict-resolution-policy-mode`, `--conflict-resolution-policy-path`, and `--conflict-resolution-policy-procedure`. Current Azure CLI documentation uses the single `--conflict-resolution-policy` JSON argument, so the commands were updated.
- The post described "three conflict resolution strategies" even though Azure Cosmos DB documents two container conflict resolution policies: Last Write Wins and Custom. The wording was changed to "main conflict resolution strategies" while keeping the author's structure of LWW, custom stored procedure, and manual conflict feed handling.
- The replication lag claim gave an unsupported fixed range of 5-50 ms. It was replaced with a workload- and region-dependent explanation.
- The version counter sample implied a local read-increment-write counter is sufficient for LWW. That can produce equal versions under concurrent regional writes, so the sample now says the version must be globally comparable and uses a placeholder `GetNextGlobalVersion()`.
- The custom stored procedure handled tombstone conflicts by dereferencing `existingItem._self`, but Microsoft documentation says `existingItem` is null when `isTombstone` is true. The code now treats tombstone conflicts as delete-wins and separately handles delete and missing-existing cases.
- The .NET conflict feed sample used `conflict.PartitionKeyValue` and read the current item as if that property were documented. It now follows the documented pattern: `ReadConflictContent`, derive the partition key from the conflicted item, `ReadCurrentAsync`, write the resolved item, then delete the conflict.
- The monitoring section suggested Azure Portal metrics for conflict feed size and resolution rate. I replaced that with application-level backlog and age tracking for manually processed conflicts, while keeping the valid `TotalRequests` / `StatusCode` metric example.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI verification was performed against Microsoft Learn rather than local `az --help` output. The stored procedure merge logic is still an illustrative business-rule example; production inventory reconciliation should be tested against the application's exact event and quantity semantics.
