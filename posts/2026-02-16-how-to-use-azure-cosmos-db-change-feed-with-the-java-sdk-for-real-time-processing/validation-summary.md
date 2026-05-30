# Validation Summary: Use Azure Cosmos DB Change Feed with the Java SDK for Real-Time Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB Change Feed
- Azure Cosmos DB Java SDK v4
- Azure CLI
- Java
- Maven
- Reactor
- SLF4J

## Sources Consulted
- Microsoft Learn: Work with the change feed in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed
- Microsoft Learn: Change feed processor in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-processor
- Microsoft Learn: Create an end-to-end Java SDK v4 application sample by using change feed - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-java-change-feed
- Microsoft Learn: Use the change feed estimator - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-use-change-feed-estimator
- Microsoft Learn Java API reference: ChangeFeedProcessorBuilder - https://learn.microsoft.com/en-us/java/api/com.azure.cosmos.changefeedprocessorbuilder
- Microsoft Learn Java API reference: ChangeFeedProcessor - https://learn.microsoft.com/en-us/java/api/com.azure.cosmos.changefeedprocessor
- Microsoft Learn Java API reference: ChangeFeedProcessorState - https://learn.microsoft.com/en-us/java/api/com.azure.cosmos.models.changefeedprocessorstate.changefeedprocessorstate
- Microsoft Learn: Manage Azure Cosmos DB resources using Azure CLI - https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-cli
- Microsoft Learn Azure CLI reference: az cosmosdb - https://learn.microsoft.com/en-us/cli/azure/cosmosdb

## Issues Found
- The post described the change feed as an ordered stream without qualifying the ordering scope. Updated the explanation to state that ordering is guaranteed within a partition key, matching Azure Cosmos DB documentation.
- The post stated that the change feed captures inserts and updates but not deletes. Updated this to clarify that this applies to latest-version mode, and noted that all-versions-and-deletes mode exists in preview for accounts using continuous backup.
- The post referenced Azure Cognitive Search, which has been renamed Azure AI Search. Updated the service name.
- The connection configuration comment called endpoint/key values a connection string. Updated the comment to say endpoint and key.
- The sample started the processor asynchronously and immediately inserted test data. Updated the sample to block until the processor has started, and to stop the processor before closing the client.
- The strongly typed POJO sample did not account for Cosmos DB system metadata fields included in change feed payloads. Added `@JsonIgnoreProperties(ignoreUnknown = true)` so Jackson deserialization does not fail on metadata fields.
- The test-data snippet used `List` without importing it. Added the missing import.
- The error-handling section said the Change Feed Processor does not automatically retry failed batches. Corrected this to explain at-least-once behavior: unhandled delegate exceptions cause processing to resume from the last checkpoint and the batch can be delivered again.
- The lag monitoring snippet built another Change Feed Processor but did not read lag. Replaced it with a `getEstimatedLag()` example that sums estimated lag by lease.

## Review Notes
The Azure Cosmos DB SDK version shown in the post, `azure-cosmos` 4.54.0, is not the latest stable release as of this review, but the covered APIs are still valid. Current Java API documentation notes that `handleChanges` is not merge-proof and recommends `handleLatestVersionChanges` for newer latest-version processors; the post remains technically valid for its selected SDK version and JSON-node examples.
