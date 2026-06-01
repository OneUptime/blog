# Validation Summary: How to Build a Spring Boot App with Azure Cosmos DB Using

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Azure Cosmos DB for NoSQL
- Azure Spring Data Cosmos
- Java
- Spring Data repositories
- Azure Cosmos DB Emulator

## Sources Consulted
- Azure Spring Data Cosmos README: https://github.com/Azure/azure-sdk-for-java/tree/azure-spring-data-cosmos_5.21.0/sdk/spring/azure-spring-data-cosmos
- CosmosRepository Java API reference: https://learn.microsoft.com/en-us/java/api/com.azure.spring.data.cosmos.repository.cosmosrepository
- Container annotation Java API reference: https://learn.microsoft.com/en-us/java/api/com.azure.spring.data.cosmos.core.mapping.container
- CosmosClientBuilder Java API reference: https://azuresdkdocs.z19.web.core.windows.net/java/azure-cosmos/4.66.0/com/azure/cosmos/CosmosClientBuilder.html
- Azure Cosmos DB consistency levels: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Azure Cosmos DB request unit consumption: https://learn.microsoft.com/en-us/azure/cosmos-db/understand-request-unit-consumption
- Azure Cosmos DB Java SDK v4 performance tips: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/performance-tips-java-sdk-v4

## Issues Found
- The configuration snippet defined `azure.cosmos.consistency-level` but did not apply it to the `CosmosClientBuilder`. Added `ConsistencyLevel` import, injected the property with a default of `SESSION`, and called `.consistencyLevel(...)` on the builder.
- The `azure.cosmos.populate-query-metrics` property was shown, but the manual configuration hard-coded query metrics on. Wired the property into `CosmosConfig.builder().enableQueryMetrics(...)` and corrected the comment to refer to query metrics.
- The controller comments said ID lookups require a partition key, but the code used `findById(id)`, `existsById(id)`, and `deleteById(id)` without passing the partition key. Updated the get, update, and delete endpoints to include `category` in the route and use `new PartitionKey(category)` with the repository's partition-aware methods.
- The emulator section omitted the Java client requirement to trust the emulator's self-signed HTTPS certificate. Added a short note to import the emulator certificate into the Java trusted certificate store.

## Review Notes
The tutorial intentionally uses Spring Boot 3.2.0 and Azure Spring Data Cosmos 5.9.0, which are compatible with the Spring Boot 3 generation. Newer Azure Spring Data Cosmos versions are available, but the examples use supported API patterns for the version shown.
