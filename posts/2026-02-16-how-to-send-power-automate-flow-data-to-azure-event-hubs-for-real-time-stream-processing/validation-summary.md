# Validation Summary: How to Send Power Automate Flow Data to Azure Event Hubs for Real-Time Stream

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Power Automate
- Azure Event Hubs
- Azure Event Hubs connector for Power Automate / Logic Apps
- Azure Stream Analytics
- Azure Event Hubs Capture
- Azure Functions
- Azure Cosmos DB output bindings
- C#

## Sources Consulted
- Azure Event Hubs tier comparison and quotas: https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Azure Event Hubs connector reference: https://learn.microsoft.com/en-us/connectors/eventhubs/
- Power Automate limits: https://learn.microsoft.com/en-us/power-automate/limits-and-config
- Power Platform request limits and allocations: https://learn.microsoft.com/en-us/power-platform/admin/api-request-limits-allocations
- Azure Stream Analytics Event Hubs inputs: https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-define-inputs
- Azure Stream Analytics metadata properties: https://learn.microsoft.com/en-us/stream-analytics-query/getmetadatapropertyvalue
- Azure Event Hubs Capture overview: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview
- Azure Functions Event Hubs bindings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs
- Azure Functions Cosmos DB bindings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2
- Azure Cosmos DB output binding for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-output

## Issues Found
- The Standard tier brokered connection limit was outdated. Updated it from 1000 to 5000 brokered connections per namespace.
- The Power Automate batching example used an unreliable expression that attempted to join Dataverse objects into JSON. Replaced it with a Select-action based pattern and named the current preview batch connector operation.
- The Power Automate limits section incorrectly described a fixed 100,000 actions-per-day Performance plan limit. Updated it to state that Power Platform request limits depend on license/performance profile and added the Event Hubs connector throttling limit.
- The Stream Analytics aggregation query used `EventType`, while the example JSON payload uses `eventType`. Updated the query to use the payload field consistently.
- The Capture destination referenced a generic Data Lake store. Updated it to Azure Data Lake Storage Gen2 and corrected the documented Capture path format to the blob name convention under the selected storage container.
- The Azure Functions C# sample mixed current Event Hubs SDK types with older body access and omitted required supporting types/usings. Updated it to use `Azure.Messaging.EventHubs.EventData`, `EventBody`, case-insensitive JSON deserialization, current Cosmos DB binding naming, and included minimal POCO types.

## Review Notes
The Azure Functions sample still uses the in-process C# model, which remains supported as of this validation date but has an announced support end date of November 10, 2026. A future update should migrate the sample to the isolated worker model.
