# Validation Summary: How to Implement Event-Driven Architecture with Azure Event Grid and Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Grid
- Azure Functions
- Azure CLI
- CloudEvents v1.0
- .NET / C#
- Azure.Messaging.EventGrid
- Azure Cosmos DB
- Azure Blob Storage dead-lettering

## Sources Consulted
- Azure Event Grid CloudEvents schema documentation: https://learn.microsoft.com/en-us/azure/event-grid/cloud-event-schema
- Azure Event Grid custom topics documentation: https://learn.microsoft.com/en-us/azure/event-grid/custom-topics
- Azure Event Grid event schema and limits: https://learn.microsoft.com/en-us/azure/event-grid/event-schema
- Azure Event Grid delivery, retry, batching, and dead-letter documentation: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Azure Event Grid filtering documentation: https://learn.microsoft.com/en-us/azure/event-grid/event-filtering
- Azure CLI `az eventgrid topic` reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/topic
- Azure CLI `az eventgrid event-subscription` reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Azure Functions Event Grid bindings documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid
- Azure Functions Event Grid trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger
- Azure SDK for .NET `CloudEvent` API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.cloudevent
- Azure SDK for .NET `EventGridPublisherClient.SendEventAsync` API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventgrid.eventgridpublisherclient.sendeventasync

## Issues Found
- The .NET CloudEvents publishing sample used `CloudEvent` without importing its namespace. I added `using Azure.Messaging;` because the current Azure SDK exposes `CloudEvent` from the `Azure.Messaging` namespace.
- The batch publishing comment said to send up to `1 MB or 5000 events per batch`. The 5,000-event value applies to Event Grid delivery batching configuration, not publishing to a custom topic. I changed the comment to describe the Event Grid publish request body limit of 1 MB.
- The Azure Functions sample said the `EventGridTrigger` binding handles the subscription automatically. The binding handles invocation when Event Grid delivers an event, but an Event Grid subscription still needs to be created, as shown later in the post. I corrected the comment.
- The dead-letter processing sample assumed Event Grid schema-style properties such as `EventType`, but the post configures the topic for CloudEvents. I updated the sample to parse a `CloudEvent` and read the CloudEvents dead-letter reason from extension attributes.
- The Cosmos DB idempotency sample used `ReadItemAsync` as if a missing item returned a response with a null resource. Cosmos DB point reads throw a not-found exception for missing items. I updated the sample to catch `CosmosException` with `HttpStatusCode.NotFound` and continue processing.

## Review Notes
The local workspace does not have the Azure CLI installed, so CLI validation was performed against the official Azure CLI reference rather than local `az --help` output. The remaining Event Grid topic commands, event subscription flags, CloudEvents schema usage, Function trigger types, retry/dead-letter behavior, and advanced filtering examples are consistent with current Microsoft documentation.
