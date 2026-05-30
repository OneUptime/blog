# Validation Summary: How to Set Up Azure Event Grid Notifications for Storage Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Grid
- Azure Storage / Blob Storage
- Azure Data Lake Storage Gen2
- Azure CLI
- Azure Functions
- Azure Storage Queues
- Azure Service Bus
- Flask / Python webhook handling
- ASP.NET Core / Azure.Messaging.EventGrid
- Azure Monitor

## Sources Consulted
- Azure Blob Storage as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage
- Azure CLI reference for `az eventgrid event-subscription`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription?view=azure-cli-latest
- Endpoint validation with Event Grid event schema: https://learn.microsoft.com/en-us/azure/event-grid/end-point-validation-event-grid-events-schema
- Receive Azure Event Grid events to an HTTP endpoint: https://learn.microsoft.com/en-us/azure/event-grid/receive-events
- Event Grid message delivery and retry: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Set dead-letter location and retry policy: https://learn.microsoft.com/en-us/azure/event-grid/manage-event-delivery
- Event Grid filtering documentation: https://learn.microsoft.com/en-us/azure/event-grid/how-to-filter-events
- Azure Service Bus message sessions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Azure Monitor supported metrics for Event Grid event subscriptions: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-eventsubscriptions-metrics

## Issues Found
- The event type table omitted `Microsoft.Storage.LifecyclePolicyCompleted` and did not mention the supported storage account kinds for Event Grid integration. Added the missing event and the StorageV2/BlockBlobStorage/BlobStorage support caveat.
- The ADLS Gen2-only notes for rename and directory events were too narrow because those events can also be emitted for SFTP APIs on hierarchical namespace accounts. Updated the descriptions.
- The webhook validation paragraph said most frameworks handle validation automatically. Corrected it to name the Azure integrations that handle it automatically and clarified that custom HTTP endpoints need to implement the handshake.
- The Service Bus section implied Service Bus topics alone provide ordered processing. Clarified that FIFO processing requires Service Bus sessions.
- The sequencer explanation implied Event Grid delivery ordering. Updated it to explain that `data.sequencer` supports relative comparison for the same blob, while Event Grid delivery is not ordered.
- The .NET handler used `ToObjectFromJson<dynamic>()`, which is not the recommended approach for current `Azure.Messaging.EventGrid` system events and can fail at runtime with `System.Text.Json` dynamic handling. Replaced it with typed `SubscriptionValidationEventData` and `StorageBlobCreatedEventData` handling.
- Azure Monitor metric display names were slightly inaccurate. Updated `Delivery Successful` to `Delivered Events` and `Delivery Failed` to `Delivery Failed Events`.

## Review Notes
The Azure CLI binary is not installed in this workspace, so CLI validation was performed against the current official Microsoft Learn Azure CLI reference. The command shapes, endpoint types, retry/dead-letter flags, subject filters, and advanced filter syntax match the official reference.
