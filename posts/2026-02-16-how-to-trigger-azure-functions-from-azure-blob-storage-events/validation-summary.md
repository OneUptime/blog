# Validation Summary: How to Trigger Azure Functions from Azure Blob Storage Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions
- Azure Blob Storage
- Azure Event Grid
- Azure CLI
- Python
- Azure Storage Blob SDK for Python
- Azure Identity / managed identity

## Sources Consulted
- Azure Event Grid trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger
- Azure Blob storage trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger
- Respond to blob storage events using Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/scenario-blob-storage-events
- Azure Blob Storage as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage
- Azure Event Grid event subscription CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Azure Event Grid event filtering: https://learn.microsoft.com/en-us/azure/event-grid/how-to-filter-events
- Azure Functions Event Grid how-to and local testing: https://learn.microsoft.com/en-us/azure/azure-functions/event-grid-how-tos
- Azure Blob Storage Python SDK quickstart: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-python

## Issues Found
- The comparison table said Event Grid supports full regex/suffix blob path filtering. Event Grid subject filters support prefix and suffix string matching, and advanced filters support operators such as `StringEndsWith`; they are not regex filters. Updated the table wording.
- The Event Grid subscription command used `--subject-ends-with ".jpg" ".png" ".gif"`, but `--subject-ends-with` accepts a single suffix string. Replaced it with `--advanced-filter subject StringEndsWith .jpg .png .gif`.
- The subject prefix filter used `/blobServices/default/containers/uploads`, which can match unintended container names such as `uploads2`. Updated it to `/blobServices/default/containers/uploads/blobs/`.
- The code uses `DefaultAzureCredential()` to access blob data, but the setup did not enable a managed identity or assign blob data permissions. Added managed identity enablement and a `Storage Blob Data Contributor` role assignment for the source storage account.
- The local Event Grid test URL omitted the `functionName` query parameter documented for local Event Grid trigger testing. Updated the curl URL to include `?functionName=ProcessUploadedBlob`.
- Removed an unused `json` import from the main Python example.
- The comment above the Event Grid trigger implied source filtering happened in the function decorator. Updated it to make clear that filtering is handled by the Event Grid subscription.

## Review Notes
- The classic Blob trigger details about polling, blob receipts, possible latency, and best-effort storage logs align with Microsoft documentation.
- The Event Grid event schema fields used in the examples (`url`, `contentType`, and `contentLength`) match the documented BlobCreated event schema.
- Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output.
