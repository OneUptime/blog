# Validation Summary: How to Use the Change Feed Processor in Azure Cosmos DB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB change feed
- Azure Cosmos DB change feed processor
- Azure Cosmos DB .NET SDK
- C#

## Sources Consulted
- Azure Cosmos DB change feed processor documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-processor
- Azure Cosmos DB change feed modes documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-modes
- Azure Cosmos DB change feed estimator documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-use-change-feed-estimator
- .NET API reference for `Container.GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes<T>`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.getchangefeedprocessorbuilderwithallversionsanddeletes
- .NET API reference for `ChangeFeedMetadata`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.changefeedmetadata

## Issues Found
- The all versions and deletes example used `GetChangeFeedProcessorBuilder(...).WithAllVersionsAndDeletesMode()`, which does not match the current .NET SDK API. Changed it to `GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes<Order>(...)`.
- The all versions and deletes example said continuous backup must be enabled on the container. Current documentation says this mode requires continuous backup on the Azure Cosmos DB account. Updated the comment accordingly.
- The delete handler used `change.Previous.Id` without explaining the current preview behavior. Current documentation exposes delete identity through `ChangeFeedMetadata.Id` and `ChangeFeedMetadata.PartitionKey`, while previous images require separate opt-in. Updated the delete example to use metadata.
- The start-time guidance used `DateTime.MinValue` directly and implied the same options applied to all change feed modes. Current documentation recommends `DateTime.MinValue.ToUniversalTime()` for latest version mode and says all versions and deletes mode starts from now or from an existing checkpoint within the continuous backup retention period. Updated both occurrences.

## Review Notes
- All versions and deletes mode is still documented as preview, and the supported SDK/API surface may change.
- The example snippets are illustrative and omit surrounding application code such as `OrderItem`, helper methods, and imports for JSON attributes.
