# Validation Summary: How to Configure Consistency Levels in Azure Cosmos DB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cosmos DB
- Azure CLI
- Azure Monitor
- .NET SDK for Azure Cosmos DB
- Python SDK for Azure Cosmos DB
- Java SDK for Azure Cosmos DB

## Sources Consulted
- Microsoft Learn: Consistency levels in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Microsoft Learn: Request Units in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/request-units
- Microsoft Learn: Manage consistency levels in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-consistency
- Microsoft Learn: Azure CLI `az cosmosdb` reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn: Python `azure.cosmos.ContainerProxy` reference - https://learn.microsoft.com/en-us/python/api/azure-cosmos/azure.cosmos.containerproxy
- Microsoft Learn: .NET `Microsoft.Azure.Cosmos.Container.ReadItemAsync` reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.readitemasync
- Microsoft Learn: .NET `ItemRequestOptions.SessionToken` reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.itemrequestoptions.sessiontoken
- Microsoft Learn: Java `CosmosItemRequestOptions` reference - https://learn.microsoft.com/en-us/java/api/com.azure.cosmos.models.cosmositemrequestoptions
- Microsoft Learn: Azure Cosmos DB monitoring data reference - https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference

## Issues Found
- Strong consistency replication was described as requiring a majority of replicas across all regions before acknowledgement. Updated it to state that, for Strong consistency, changes must be committed in every region in the account.
- Consistent Prefix was described as a general no-gap guarantee for all writes. Updated it to match current Azure Cosmos DB documentation: transactional batches are returned consistently with the committed transaction, while single-document writes follow eventual consistency semantics.
- Eventual consistency was described as usually converging within seconds. Removed the unbounded timing claim because Azure Cosmos DB does not provide a fixed convergence bound for Eventual consistency.
- Eventual consistency was described as having the lowest RU cost. Updated the wording because Eventual, Session, and Consistent Prefix use single-replica reads and have the same relative read RU cost; Strong and Bounded Staleness reads cost approximately twice as much.
- Write replication was described as the same process across all consistency levels. Updated it to clarify that write RU cost is identical for a given write operation, but Strong commits changes in every region while the other levels use a local majority.
- The decision framework said dropping to Eventual saves RU costs. Updated it to clarify that this saves read RUs only when relaxing from Strong or Bounded Staleness.
- Bounded Staleness in multi-region accounts was described as behaving like Strong in the write region. Updated it to the documented K-version or T-time cross-region staleness bound and throttling behavior when lag exceeds the configured bound.

## Review Notes
The Azure CLI command flags, Azure Monitor `ReplicationLatency` metric name, .NET read and session-token examples, Python query example using request headers, and Java request-options example are consistent with current Microsoft documentation. Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn rather than local `az --help` output.
