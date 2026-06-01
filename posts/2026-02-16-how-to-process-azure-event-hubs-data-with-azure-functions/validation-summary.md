# Validation Summary: How to Process Azure Event Hubs Data with Azure Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Event Hubs triggers and output bindings
- Azure Functions host.json configuration
- Azure Functions Python v2 programming model
- Azure Functions JavaScript/TypeScript v4 programming model
- Azure Functions C# in-process model
- Azure Cosmos DB output bindings
- Azure Monitor and Application Insights

## Sources Consulted
- Azure Event Hubs trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs-trigger
- Azure Event Hubs output binding for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs-output
- Azure Event Hubs trigger and bindings for Azure Functions overview and host.json reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs
- Azure Functions error handling and retry guidance: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-error-pages
- Event Hubs with Azure Functions architecture guidance: https://learn.microsoft.com/en-us/azure/architecture/serverless/event-hubs-functions/event-hubs-functions
- Azure Cosmos DB output binding for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-output
- Azure Functions Python library decorator source: https://github.com/Azure/azure-functions-python-library

## Issues Found
- The Python Event Hubs examples iterated over `events` but did not set `cardinality="many"`. Added the batch cardinality setting and updated type hints to `list[func.EventHubEvent]`.
- The `host.json` sample used the older `eventProcessorOptions.maxBatchSize` shape. Updated it to the current Event Hubs extension 5.x/6.x settings with `maxEventBatchSize` and top-level `prefetchCount`.
- The `batchCheckpointFrequency` example recommended checkpointing every fifth batch without mentioning the scaling caveat. Reset the sample to `1` and noted that higher values can cause incorrect target-based scaling behavior.
- The Cosmos DB output example used `func.DocumentList` for an output binding and set `processedAt` from the event enqueue time. Updated the output type to a list of `func.Document` values and set `processedAt` to the actual processing time.
- The Event Hub fan-out example serialized a list into one JSON message instead of sending multiple output events. Updated the output bindings to `func.Out[list[str]]` and set the lists directly.
- The retry description implied automatic retry of any failed batch. Updated the wording to reflect Azure Functions function-level retry policies for Event Hubs and that retries happen at the invocation level, not per event.
- The scaling section stated that maximum instances are exactly equal to the partition count. Updated this to describe maximum useful parallelism for a consumer group, which is limited by partition count.

## Review Notes
- The C# example uses the in-process model, which remains supported until November 10, 2026 but is on a migration path to the isolated worker model.
- The Event Hubs extension 6.x changed the default `maxEventBatchSize` to 100; older extension versions used different defaults and host.json property names.
