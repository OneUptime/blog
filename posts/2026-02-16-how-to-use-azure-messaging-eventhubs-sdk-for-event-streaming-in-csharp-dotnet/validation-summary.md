# Validation Summary: How to Use Azure.Messaging.EventHubs SDK for Event Streaming in C# .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Hubs
- Azure.Messaging.EventHubs SDK for .NET
- Azure.Messaging.EventHubs.Processor
- Azure Blob Storage checkpointing
- Azure CLI
- C#/.NET console applications

## Sources Consulted
- Microsoft Learn: Azure Event Hubs scalability guide - https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-scalability
- Microsoft Learn: Compare Azure Event Hubs tiers - https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Microsoft Learn: Azure CLI `az eventhubs eventhub` reference - https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub
- Microsoft Learn: EventHubProducerClient API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventhubs.producer.eventhubproducerclient
- Microsoft Learn: CreateBatchOptions API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventhubs.producer.createbatchoptions
- Microsoft Learn: EventData constructors API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventhubs.eventdata.-ctor
- Microsoft Learn: EventProcessorClient.ProcessEventAsync API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventhubs.eventprocessorclient.processeventasync
- Microsoft Learn: Azure Event Hubs Event Processor client library for .NET - https://learn.microsoft.com/en-us/dotnet/api/overview/azure/messaging.eventhubs.processor-readme

## Issues Found
- The Azure CLI command used `--message-retention 1`, which is not listed in the current `az eventhubs eventhub create` reference. Changed it to `--retention-time 24`, matching the current option name and its hour-based value.
- The producer sample said it would create a new batch when `TryAdd` failed, but the code sent the current batch and broke out of the loop, which could drop the event that failed to fit. Changed the sample to throw when an event cannot fit in the batch, which is accurate for this small fixed-size batch example.
- The consumer sample incremented a shared `eventsProcessed` integer from potentially concurrent partition processing callbacks. Changed it to use `Interlocked.Increment` so the counter and checkpoint interval logic are thread-safe.
- The production guidance described per-partition throughput without mentioning the namespace throughput-unit cap. Updated the wording to clarify that per-partition throughput is a planning baseline and total Standard tier throughput is still limited by configured throughput units.

## Review Notes
- The local workspace does not have `az` or `dotnet` installed, so commands and C# examples were validated against official Microsoft documentation rather than by local execution.
- The throughput and retention guidance matches the current Event Hubs scalability and tier documentation, including Standard tier retention up to 7 days and Premium retention up to 90 days.
