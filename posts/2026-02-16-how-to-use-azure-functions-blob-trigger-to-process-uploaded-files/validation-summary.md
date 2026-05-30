# Validation Summary: How to Use Azure Functions Blob Trigger to Process Uploaded Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Blob Storage triggers and bindings
- Event Grid-based blob triggers
- Azure CLI Event Grid subscriptions
- C# isolated worker Azure Functions
- Azure Storage SDK for .NET
- CsvHelper
- SixLabors ImageSharp

## Sources Consulted
- Azure Blob storage trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger
- Azure Blob storage trigger and bindings for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob
- Respond to blob storage events using Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/scenario-blob-storage-events
- Storage considerations for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/storage-considerations
- Azure CLI `az eventgrid event-subscription` reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Azure Blob Storage as Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage

## Issues Found
- The polling latency was described as checking every few seconds and detecting new blobs within up to 60 seconds. Microsoft documentation describes polling blob triggers as higher latency, with delays of several minutes and up to 10 minutes on the Consumption plan when a function app has gone idle. Updated the diagram label and latency explanation.
- The Event Grid section said to update `host.json` to use the Event Grid blob trigger source, but the source is configured on the blob trigger binding with `Source = BlobTriggerSource.EventGrid`. Updated the text to clarify that the shown `host.json` snippet tunes concurrency for Storage extension 5.x and later.
- The poison blob section claimed there is no automatic dead-letter mechanism for blob triggers. Azure Functions creates a message in the `webjobs-blobtrigger-poison` Storage queue after retries are exhausted. Updated the explanation to describe the poison queue and position the error-container copy as an optional custom review pattern.

## Review Notes
The C# examples are partial tutorial snippets and assume surrounding project setup, package references, application settings, and user-defined types such as `IDataRepository`, `SalesRecord`, and `ProcessLine`. The Azure Functions APIs, `BlobTriggerSource.EventGrid` usage, `maxDegreeOfParallelism` setting, and Azure CLI Event Grid subscription options were verified against current Microsoft documentation.
