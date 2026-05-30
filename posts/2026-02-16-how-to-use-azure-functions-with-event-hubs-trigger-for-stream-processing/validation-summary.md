# Validation Summary: How to Use Azure Functions with Event Hubs Trigger for Stream Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Hubs
- Azure Functions Event Hubs trigger and output binding
- Azure Functions host.json configuration
- Azure CLI
- JavaScript / Node.js
- @azure/event-hubs
- Azure Cosmos DB output binding
- Serverless stream processing

## Sources Consulted
- Azure Event Hubs trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs-trigger
- Azure Event Hubs bindings for Azure Functions and host.json settings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs
- Target-based scaling in Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-target-based-scaling
- Azure Event Hubs overview: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about
- Azure CLI Event Hubs namespace commands: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- Azure CLI Event Hubs eventhub commands: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Azure CLI Event Hubs consumer group commands: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub/consumer-group
- Azure CLI Event Hubs namespace authorization-rule commands: https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace/authorization-rule
- EventHubProducerClient JavaScript API: https://learn.microsoft.com/en-us/javascript/api/@azure/event-hubs/eventhubproducerclient
- Azure Cosmos DB output binding for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-output

## Issues Found
- The Event Hubs trigger binding set `dataType` to `string` while the function code treated each event as a JavaScript object. Removed `dataType` so JSON event bodies can be deserialized for the examples as written.
- The `host.json` sample used the older `eventProcessorOptions.maxBatchSize` shape. Updated it to the current Event Hubs extension v5/v6 style using `maxEventBatchSize` and top-level `prefetchCount`.
- The `batchCheckpointFrequency` sample used `5` without noting Azure's target-based scaling caveat. Changed the sample to `1` and clarified that higher values can affect scale decisions.
- The producer batching example created `newBatch` when the current batch was full but never assigned it back to `batch`, so events after the first full batch could be dropped or resent incorrectly. Changed `batch` to `let`, reassigned it after sending a full batch, preserved event properties, and added an error if a single event cannot fit in an empty batch.
- The scaling description said Functions scales out to match the partition count. Updated it to state that Event Hubs triggers scale based on unprocessed events, with partition count limiting maximum target instances.
- The partition key wording implied the same function instance always processes related events. Updated it to say events are processed in partition order by one active consumer for that partition at a time, which allows for rebalancing and failover.

## Review Notes
The Azure CLI commands are consistent with the documented command groups and parameters, but the Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn rather than local `az --help` output.
