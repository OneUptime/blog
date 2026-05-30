# Validation Summary: How to Set Up Azure Event Grid Dead-Lettering for Failed Event Deliveries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Grid
- Azure Blob Storage
- Azure CLI
- Bicep / ARM resource definitions
- Azure Monitor metrics alerts
- Azure Managed Identity and RBAC
- C# / Azure.Storage.Blobs

## Sources Consulted
- Azure Event Grid message delivery and retry: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Azure Event Grid dead-letter location and retry policy: https://learn.microsoft.com/en-us/azure/event-grid/manage-event-delivery
- Azure CLI `az eventgrid event-subscription`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Bicep resource reference for `Microsoft.EventGrid/topics/eventSubscriptions@2022-06-15`: https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/2022-06-15/topics/eventsubscriptions
- Azure Event Grid managed identities: https://learn.microsoft.com/en-us/azure/event-grid/managed-service-identity
- Assign managed identity to Event Grid custom topics and domains: https://learn.microsoft.com/en-us/azure/event-grid/enable-identity-custom-topics-domains
- Azure Monitor supported metrics for Event Grid topics: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-topics-metrics
- Azure Monitor supported metrics for Event Grid event subscriptions: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-eventsubscriptions-metrics

## Issues Found
- The dead-letter blob path was inaccurate. Microsoft documentation states that blob names include the event subscription name in uppercase and a nonzero-padded UTC date/hour path. Updated the path example accordingly.
- The dead-letter blob payload was shown as a single wrapper object with an `event` property. Event Grid writes one or more dead-lettered events in a JSON array, preserving the event schema and adding dead-letter metadata to each event. Updated the JSON sample and explanation.
- The list of `deadLetterReason` values included unsupported or unverified values. Replaced it with the documented `MaxDeliveryAttemptsExceeded` example and a TTL-expiry condition note.
- The C# processor deserialized a single object and expected an `event` property that does not match the documented payload. Updated it to deserialize a list of dead-letter events and process each item.
- The C# processor used default `System.Text.Json` property matching, which would not reliably bind the camelCase Event Grid JSON to PascalCase C# properties. Added case-insensitive serializer options.
- The C# model included `LastHttpStatusCode`, which is not part of the documented Event Grid dead-letter event examples. Removed it and modeled the original event fields plus dead-letter metadata.
- The managed identity section granted RBAC but did not show enabling the topic identity or configuring the event subscription with identity-specific dead-letter settings. Added the `az eventgrid topic update --identity systemassigned` and `--deadletter-identity-endpoint` / `--deadletter-identity systemassigned` commands.

## Review Notes
The Azure CLI was not installed in the workspace, so CLI command validation was performed against the official Azure CLI reference and Event Grid documentation. The managed identity dead-letter CLI parameters are currently marked preview in the Azure CLI reference.
