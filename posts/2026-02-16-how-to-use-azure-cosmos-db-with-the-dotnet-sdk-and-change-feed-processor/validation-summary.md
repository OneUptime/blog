# Validation Summary: How to Use Azure Cosmos DB with the .NET SDK and Change Feed Processor

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Microsoft.Azure.Cosmos .NET SDK
- C#
- Change Feed
- Change Feed Processor
- Change Feed Estimator

## Sources Consulted
- Microsoft Learn: Work with change feed in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed
- Microsoft Learn: Change feed modes in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-modes
- Microsoft Learn: Change feed processor in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-processor
- Microsoft Learn: Change feed design patterns in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-design-patterns
- Microsoft Learn API reference: Container.GetChangeFeedEstimatorBuilder - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.getchangefeedestimatorbuilder
- Microsoft Learn API reference: ChangeFeedProcessorBuilder.WithStartTime - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.changefeedprocessorbuilder.withstarttime
- Microsoft Learn API reference: Database.CreateContainerIfNotExistsAsync - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.database.createcontainerifnotexistsasync

## Issues Found
- The introduction described the change feed as a sorted list of documents within a container. Updated it to specify that ordering is within each logical partition, matching Azure Cosmos DB documentation.
- The change feed explanation said applications receive push notifications. Updated it to describe the Change Feed Processor reading the feed and invoking the delegate when new changes are found.
- The audit trail bullet implied the default latest-version change feed is sufficient for a full audit trail. Updated it to clarify that audit scenarios require event-style modeling or all versions and deletes mode.
- The dead-letter example wrote to a partition key value based on `order.CustomerId` but did not include a matching `customerId` property in the dead-letter document. Added `customerId = order.CustomerId` to keep the item consistent with a `/customerId` partition key.
- The performance tips said a cleared lease container always causes the processor to start from the beginning. Updated it to explain that the processor initializes from its configured starting point, such as the beginning only when `WithStartTime(DateTime.MinValue.ToUniversalTime())` is configured.

## Review Notes
The local environment did not have the `dotnet` CLI installed, so the snippets could not be compiled locally. SDK method signatures and behavior were checked against official Microsoft Learn documentation instead. The post uses latest-version change feed APIs; all versions and deletes mode remains preview and has different requirements and data models.
