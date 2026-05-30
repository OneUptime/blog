# Validation Summary: How to Use Azure Event Grid with Power Automate to React to Blob Storage Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Grid
- Azure Blob Storage
- Power Automate
- Azure Event Grid connector
- Azure Monitor
- Microsoft Teams connector
- AI Builder
- Azure Functions
- Dataverse
- Azure Table Storage

## Sources Consulted
- Microsoft Learn: Azure Blob Storage as an Event Grid source - https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage
- Microsoft Learn: Reacting to Azure Blob storage events - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-event-overview
- Microsoft Learn: Azure Event Grid connector for Power Automate and Logic Apps - https://learn.microsoft.com/en-us/connectors/azureeventgrid/
- Microsoft Learn: Endpoint validation with Event Grid event schema - https://learn.microsoft.com/en-us/azure/event-grid/end-point-validation-event-grid-events-schema
- Microsoft Learn: Event Grid message delivery and retry - https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Microsoft Learn: Set dead-letter location and retry policy - https://learn.microsoft.com/en-us/azure/event-grid/manage-event-delivery
- Microsoft Learn: Event filtering for Azure Event Grid subscriptions - https://learn.microsoft.com/en-us/azure/event-grid/how-to-filter-events
- Microsoft Learn: Supported metrics for Microsoft.EventGrid/eventSubscriptions - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-eventsubscriptions-metrics
- Microsoft Learn: Supported metrics for Microsoft.EventGrid/topics - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-topics-metrics

## Issues Found
- The supported storage account kinds were incomplete. Added `BlockBlobStorage` and clarified that Storage (general purpose v1) accounts do not support Event Grid integration.
- The Power Automate setup implied a webhook URL was needed when using the Azure Event Grid connector. Updated the wording to state that the connector can create the Event Grid subscription automatically.
- The manual webhook subscription steps omitted Event Grid endpoint validation. Added a note that a generic HTTP-triggered Power Automate flow must handle the subscription validation event or complete the manual validation URL within 10 minutes.
- The subject prefix filter for a container stopped before the `/blobs/` path segment. Updated it to `/blobServices/default/containers/uploads/blobs/` so it matches blobs within the `uploads` container.
- The Power Automate condition example used an invalid multi-line `AND` expression. Replaced it with the supported `@and(...)` expression syntax.
- The Parse JSON schema omitted top-level Event Grid fields that the post later discusses, including `id`. Added common top-level fields from the Event Grid schema.
- The retry section implied every non-2xx response is retried. Added the official caveat that some webhook status codes, including 400, 401, 403, and 413, are not retried.
- The Azure Monitor metric names used informal or outdated display labels. Updated them to the documented display names and REST metric names, including `Published Events`, `Delivered Events`, `Delivery Failed Events`, `PublishSuccessCount`, `DeliverySuccessCount`, and `DeliveryAttemptFailCount`.

## Review Notes
The tutorial remains technically relevant and the overall architecture is correct. Power Automate connector UI labels can vary slightly by environment, but the connector, trigger, and parameters described match the current Microsoft connector documentation.
