# Validation Summary: How to Use Dapr with Azure Event Hubs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Event Hubs
- Azure Blob Storage (for checkpointing)
- Azure CLI (`az eventhubs`)
- Python (Flask, requests)
- Dapr HTTP API

## Sources Consulted
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Azure Event Hubs component spec — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-eventhubs/
- Azure CLI `az eventhubs` reference — https://learn.microsoft.com/en-us/cli/azure/eventhubs
- Azure Monitor metrics for Event Hubs — https://learn.microsoft.com/en-us/azure/event-hubs/monitor-event-hubs-reference

## Issues Found

1. **Partition key passed as HTTP header instead of query parameter**: The publish example passed `partitionKey` as an HTTP header. Per Dapr's publish API spec, metadata must be sent as query parameters prefixed with `metadata.` (e.g., `?metadata.partitionKey=value`). Fixed by moving the partition key from `headers` to `params` with the correct `metadata.partitionKey` key.

2. **`consumerID` placed in subscription metadata instead of component spec**: The programmatic subscription included `"consumerID": "inventory-consumer"` in the subscription metadata. Dapr's Event Hubs component uses the app-id as the consumer group name by default, and `consumerID` is a component-level metadata field, not a subscription-level one. Fixed by removing it from the subscription and adding it to the component spec.

3. **Misleading consumer group lag monitoring command**: The `az eventhubs eventhub consumer-group show` command was described as monitoring "consumer group offset lag," but it only returns resource metadata (name, user metadata). Offset lag requires Azure Monitor metrics. Fixed by correcting the comment and adding an `az monitor metrics list` example for actual metrics monitoring.

## Review Notes
- The `Content-Type: application/json` header in the publish example is redundant when using `requests.post(..., json=...)` since the library sets it automatically, but it is not incorrect and can serve as explicit documentation of intent.
- The managed identity config with an empty `azureClientId` value correctly triggers system-assigned managed identity. For user-assigned managed identity, a specific client ID would be needed.
- The `az monitor metrics list` command added uses a placeholder `<sub-id>` for the subscription ID, which the reader must replace with their own Azure subscription ID.
