# Validation Summary: How to Set Message Visibility Timeout in Azure Queue Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Queue Storage
- Azure Storage Queue REST API
- Azure Storage Queue client library for Python
- Azure Storage Queue client library for .NET
- Azure Functions queue trigger configuration

## Sources Consulted
- Microsoft Learn: Azure Storage QueueClient class for Python - https://learn.microsoft.com/en-us/python/api/azure-storage-queue/azure.storage.queue.queueclient
- Microsoft Learn: QueueClient.ReceiveMessagesAsync for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.receivemessagesasync
- Microsoft Learn: Get Messages REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/get-messages
- Microsoft Learn: Update Message REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/update-message
- Microsoft Learn: Put Message REST API - https://learn.microsoft.com/en-us/rest/api/storageservices/put-message
- Microsoft Learn: Azure Functions Queue Storage trigger and bindings - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue

## Issues Found
- The post stated that the minimum visibility timeout is always 0 seconds. Azure Queue Storage receive operations require a visibility timeout of at least 1 second, while update and enqueue operations allow 0 seconds. Updated the explanation to distinguish receive, update, and enqueue behavior.
- The mid-processing Python sample extended a message's visibility timeout but continued using the original message object for deletion. Because updating a message returns a new pop receipt, subsequent operations must use the latest returned message or pop receipt. Updated the sample to assign the result of `update_message` back to `msg`.
- The post referred to setting visibility timeout at the queue level. Raw Azure Queue Storage does not expose a queue-level visibility timeout setting for receive operations. Updated the text to explain per-receive configuration and distinguish Azure Functions queue trigger `host.json` behavior.

## Review Notes
The remaining Python and C# examples use current Azure Storage Queue SDK APIs. The post's guidance about pop receipts, at-least-once delivery, delayed messages, clock skew, dequeue counts, and update transactions matches the official Azure documentation.
