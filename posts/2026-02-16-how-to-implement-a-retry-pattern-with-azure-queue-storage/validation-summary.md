# Validation Summary: How to Implement a Retry Pattern with Azure Queue Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Queue Storage
- Azure Storage Queues SDK for Python
- Azure Storage Queues SDK for .NET
- Python
- C#
- Retry patterns, visibility timeouts, dequeue counts, poison queues, exponential backoff, and jitter

## Sources Consulted
- Azure Storage Queues client library for Python quickstart: https://learn.microsoft.com/en-us/azure/storage/queues/storage-quickstart-queues-python
- Azure Storage Queues Python `QueueClient` API reference: https://learn.microsoft.com/en-us/python/api/azure-storage-queue/azure.storage.queue.queueclient
- Azure Storage Queues client library for .NET quickstart: https://learn.microsoft.com/en-us/azure/storage/queues/storage-quickstart-queues-dotnet
- Azure Storage Queues .NET `ReceiveMessagesAsync` API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.receivemessagesasync
- Azure Storage Queues .NET `UpdateMessageAsync` API reference: https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.updatemessageasync
- Azure Queue Storage REST API `Update Message`: https://learn.microsoft.com/en-us/rest/api/storageservices/update-message
- Azure Functions Queue Storage trigger documentation for poison-message behavior and queue retry settings: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger

## Issues Found
- The Python examples used `messages_per_page=1` while describing receipt of a single message. In the Azure SDK for Python, `messages_per_page` controls page size, while `max_messages` caps the total messages returned by the iterator. Updated the examples to use `max_messages=1`.
- The jitter helper described "full jitter" and said it randomized between 0 and the calculated backoff value, but the code returned a value between `base_timeout` and `capped_timeout`. Updated the code to return `random.randint(0, capped_timeout)` so it matches the documented behavior in the post.
- The .NET `UpdateMessageAsync` example omitted the message body argument required by the current Azure.Storage.Queues overload. Updated the call to pass `message.Body` before the visibility timeout value.

## Review Notes
- The post's high-level explanations of dequeue count, visibility timeout, message deletion after successful processing, and poison queue handling are consistent with Azure Queue Storage documentation.
- The examples are illustrative snippets and assume surrounding definitions such as `process_task`, `TransientError`, `poison_queue_client`, `connectionString`, `poisonQueueClient`, and `ProcessTaskAsync`.
