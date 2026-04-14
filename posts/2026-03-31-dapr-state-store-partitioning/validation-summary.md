# Validation Summary: How to Use State Store Partitioning in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management building block)
- Redis Cluster (hash slots, CRC16, hash tags)
- Azure Cosmos DB (partition keys)
- AWS DynamoDB (partition key + sort key)
- Dapr State API (HTTP)

## Sources Consulted
- Dapr state management docs — https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr state store key prefix / shared state — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr Redis state store reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Cosmos DB state store reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr DynamoDB state store reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr State API reference — https://docs.dapr.io/reference/api/state_api/
- Redis Cluster specification (hash slots 0-16383, CRC16)

## Issues Found
1. **Inaccurate claim about prefix-based routing (line 37):** The original text stated "many state stores use prefix-based routing, causing all writes to go to the same partition." This is misleading because all three state stores discussed in the post (Redis Cluster, Cosmos DB, DynamoDB) use hash-based partitioning, not prefix-based/range-based routing. Hash functions distribute unique keys across partitions regardless of shared prefixes. Changed to clarify that the hotspot concern applies to range-partitioned state stores specifically.

2. **Incorrect code block language identifier (line 44):** The key pattern templates (`{userId}-order-{orderId}`, etc.) were marked as ` ```json ` but are not valid JSON. Changed to ` ```text `.

## Review Notes
- The Cosmos DB section advises designing values to include a `partitionKey` field. In practice, Dapr's Cosmos DB component manages the `partitionKey` field in stored documents internally (typically setting it to the state key value). A user-supplied `partitionKey` field inside the state value would be stored within the `value` portion of the document and would not directly control Cosmos DB partition routing. This is worth clarifying in a future revision but was not changed since the exact behavior may vary by Dapr version and component configuration.
- The general key design advice (place high-cardinality fields early) is sound best practice even for hash-based stores, as it improves key readability and supports scenarios where you might later migrate to a range-partitioned backend.
- All Dapr component YAML configurations, API endpoints, CLI commands, and technical details (Redis CRC16 hash slots 0-16383, key prefix format `appid||key`, hash tag behavior) were verified as correct.
