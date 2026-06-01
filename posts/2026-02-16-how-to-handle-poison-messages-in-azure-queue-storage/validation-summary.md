# Validation Summary: How to Handle Poison Messages in Azure Queue Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Queue Storage
- Azure Storage Queues Python SDK (`azure-storage-queue`)
- Azure Storage Queues .NET SDK (`Azure.Storage.Queues`)
- Azure CLI storage queue commands
- Poison message handling and dead-letter queue patterns

## Sources Consulted
- Microsoft Learn: Azure Queue Storage client library for Python quickstart - https://learn.microsoft.com/en-us/azure/storage/queues/storage-quickstart-queues-python
- Microsoft Learn: `azure.storage.queue.QueueClient` API reference - https://learn.microsoft.com/en-us/python/api/azure-storage-queue/azure.storage.queue.queueclient
- Microsoft Learn: Azure Queue Storage client library for .NET quickstart - https://learn.microsoft.com/en-us/azure/storage/queues/storage-quickstart-queues-dotnet
- Microsoft Learn: `Azure.Storage.Queues.QueueClient.ReceiveMessagesAsync` API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.receivemessagesasync
- Microsoft Learn: `Azure.Storage.Queues.Models.QueueMessage` API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.models.queuemessage
- Microsoft Learn: Azure CLI `az storage queue metadata show` reference - https://learn.microsoft.com/en-us/cli/azure/storage/queue/metadata
- Microsoft Learn: Azure Queue Storage REST API `Get Messages` - https://learn.microsoft.com/en-us/rest/api/storageservices/get-messages
- Microsoft Learn: Azure Queue Storage REST API `Get Queue Metadata` - https://learn.microsoft.com/en-us/rest/api/storageservices/get-queue-metadata
- Microsoft Learn: Azure Functions queue storage trigger poison message behavior - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger

## Issues Found
- The C# sample used `message.MessageText`. Current `QueueMessage` API documentation exposes message content through the `Body` property, so the sample now uses `message.Body.ToString()` for processing and dead-letter metadata.
- The exponential backoff example's formula did not match its comment. `30 * (2 ** message.dequeue_count)` schedules the first failed processing attempt at 60 seconds because the first dequeue count is 1. Updated it to `30 * (2 ** (message.dequeue_count - 1))`, matching the documented retry sequence in the comment.

## Review Notes
- Azure Queue Storage itself does not provide a Service Bus-style dead-letter queue. Azure Functions queue triggers do provide a poison queue behavior for function apps, but this post is correctly focused on workers using Queue Storage directly.
- The Azure CLI command group for `az storage queue` is currently marked preview in Microsoft Learn, but the command shown is documented.
- Local SDK compilation/runtime checks were not possible in this workspace because `dotnet`, `python`, and `az` were not installed. The review was performed against official Microsoft documentation and API references.
