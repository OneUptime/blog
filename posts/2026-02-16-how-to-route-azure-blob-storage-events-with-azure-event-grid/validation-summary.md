# Validation Summary: How to Route Azure Blob Storage Events with Azure Event Grid

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Event Grid
- Azure Event Grid system topics and event subscriptions
- Azure CLI
- Azure Functions isolated worker
- C#
- Azure.Messaging.EventGrid
- Azure Storage Blob SDK
- Bicep / Azure Resource Manager
- Azure Service Bus queues

## Sources Consulted
- Azure Blob Storage as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage
- Azure CLI `az eventgrid system-topic event-subscription`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/system-topic/event-subscription
- Create, view, and manage Azure Event Grid system topics using CLI: https://learn.microsoft.com/en-us/azure/event-grid/create-view-manage-system-topics-cli
- Event filtering in Azure Event Grid: https://learn.microsoft.com/en-us/azure/event-grid/event-filtering
- Azure Event Grid bindings for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid
- Microsoft.EventGrid/systemTopics/eventSubscriptions Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/systemtopics/eventsubscriptions
- Azure SDK for .NET `StorageBlobCreatedEventData`: https://azuresdkdocs.z19.web.core.windows.net/dotnet/Azure.Messaging.EventGrid/4.30.0/api/Azure.Messaging.EventGrid.SystemEvents/Azure.Messaging.EventGrid.SystemEvents.StorageBlobCreatedEventData.html
- Azure Event Grid message delivery and retry: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry

## Issues Found
- The introduction described Event Grid as pushing blob events when a blob is "modified." Azure Blob Storage Event Grid events are more specific: BlobCreated is raised when a blob is created or replaced, and BlobDeleted is raised when a blob is deleted. Changed "modified" to "replaced."
- The available event list omitted `Microsoft.Storage.LifecyclePolicyCompleted`, which is included in the official Blob Storage Event Grid source documentation. Added it.
- The BlobCreated description said the event fires for "any API that creates a blob." Tightened this to the documented Blob REST operations such as PutBlob, PutBlockList, and CopyBlob.
- The C# sample used a custom event data model. Replaced it with the SDK-provided `StorageBlobCreatedEventData` type from `Azure.Messaging.EventGrid.SystemEvents`.
- The async placeholder methods in the C# sample contained no `await`, which would produce compiler warnings in a copy-pasted example. Added `await Task.CompletedTask;` placeholders.
- The Bicep section claimed to be complete but referenced `functionApp` and `serviceBusNamespace` without defining them. Added parameters for the existing Function App name and Service Bus queue resource ID, and declared the Function App as an existing resource.
- The duplicate-events section implied duplicates mainly come from multi-call blob creation. Event Grid uses at-least-once delivery, so duplicate delivery can occur independently of the storage API sequence. Reworded the section and noted that `source`/`topic` plus `id` is safer across multiple sources.

## Review Notes
Azure CLI and Bicep tooling were not installed in the workspace, so command and template validation were performed against official Microsoft Learn references rather than local compilation. The Bicep sample is now structurally accurate for the resources it declares, but it still assumes the destination Function App and Service Bus queue already exist.
