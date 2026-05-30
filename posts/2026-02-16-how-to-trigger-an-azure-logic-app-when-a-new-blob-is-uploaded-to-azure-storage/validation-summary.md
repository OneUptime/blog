# Validation Summary: How to Trigger an Azure Logic App When a New Blob Is Uploaded to Azure Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Logic Apps
- Azure Blob Storage connector
- Azure Event Grid
- Azure Service Bus queues
- Azure CLI
- Managed identity authentication

## Sources Consulted
- Microsoft Learn: Azure Blob Storage managed connector reference: https://learn.microsoft.com/en-us/connectors/azureblobconnector/
- Microsoft Learn: Connect to Azure Blob Storage from workflows in Azure Logic Apps: https://learn.microsoft.com/en-us/azure/connectors/connectors-create-api-azureblobstorage
- Microsoft Learn: Azure Blob Storage as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage
- Microsoft Learn: Reacting to Azure Blob storage events: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-event-overview
- Microsoft Learn: Azure Event Grid delivery and retry: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Microsoft Learn: Azure Event Grid event subscription CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: Configure Service Bus queues as Event Grid handlers: https://learn.microsoft.com/en-us/azure/event-grid/handler-service-bus
- Microsoft Learn: Azure Service Bus queue CLI reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue
- Microsoft Learn: Azure Event Grid quotas and limits: https://learn.microsoft.com/en-us/azure/event-grid/quotas-limits

## Issues Found
- The post used the non-V2 Azure Blob Storage polling trigger name and deprecated Blob connector action operation IDs. Updated the trigger and workflow snippets to use the current V2 trigger/action names and operation IDs documented by Microsoft.
- The polling latency claim gave fixed minimums for Standard and Consumption workflows. Reworded it because supported intervals depend on workflow type and connector version.
- The post described Event Grid as handling "millions of events per second" without reference to quota limits. Reworded this to reflect high-volume routing subject to documented service quotas.
- The post described Event Grid and Service Bus as providing "guaranteed delivery" for blob upload events. Reworded this to at-least-once delivery, durable buffering, retries, expiration, and max delivery count behavior, which matches the official delivery semantics.
- The Blob copy/delete example used a full blob URL where the connector documentation recommends a relative path for same-account copy operations. Updated the example to derive the relative path from the Event Grid blob URL.

## Review Notes
The examples are still illustrative workflow fragments, not complete deployable Logic App definitions. A future revision could add a complete exported workflow definition or an Azure Developer CLI/Bicep deployment sample.
