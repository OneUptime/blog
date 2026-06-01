# Validation Summary: How to Build Background Workers with Azure Queue Storage and .NET Worker Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Queue Storage
- Azure Storage Queues client library for .NET (`Azure.Storage.Queues`)
- .NET Worker Service / `BackgroundService`
- ASP.NET Core Web API
- Azure CLI
- Azure Container Apps queue-based scaling
- Docker and Azure Container Registry

## Sources Consulted
- Microsoft Learn: Introduction to Azure Queue Storage - https://learn.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction
- Microsoft Learn: Azure Queue Storage client library for .NET quickstart - https://learn.microsoft.com/en-us/azure/storage/queues/storage-quickstart-queues-dotnet
- Microsoft Learn: `QueueClient` constructors for `Azure.Storage.Queues` - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.-ctor
- Microsoft Learn: `QueueClientOptions.MessageEncoding` - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclientoptions.messageencoding
- Microsoft Learn: `QueueClient.SendMessageAsync` - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.queues.queueclient.sendmessageasync
- Microsoft Learn: Azure Container Apps scaling - https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Microsoft Learn: Azure CLI `az containerapp create` reference - https://learn.microsoft.com/en-us/cli/azure/containerapp

## Issues Found
- The API code comment said messages are Base64 encoded by default. In the current `Azure.Storage.Queues` client, `QueueClientOptions.MessageEncoding` defaults to `None`, so the post now says the sample explicitly encodes messages as Base64.
- The worker project referenced `OrderMessage` without defining it or sharing it from the API project. Added a matching worker-side model and noted that a real application would normally use a shared class library.
- The worker snippet did not register `QueueClient` or `OrderProcessingWorker` in the worker host, so constructor injection would not work. Added a `Program.cs` snippet that registers the queue client and hosted service.
- The poison queue code attempted to construct a `QueueClient` using `_queueClient.AccountName` as the first string argument. That constructor expects a connection string, not an account name. Updated the worker to read the configured storage connection string and use it for the poison queue client.
- The Azure Container Apps example used inconsistent mixed-case registry placeholders and omitted pieces required by the documented CLI pattern for queue-based scaling. Updated the sample to use lowercase registry naming, include an environment parameter, define a storage connection secret, include `queueLength`, and quote the scale rule auth argument.

## Review Notes
The core architecture, visibility timeout explanation, retry behavior, dequeue count usage, batch receive example, and 64 KB queue message limit are consistent with Microsoft documentation. The post still uses connection strings for simplicity; for production, managed identity is generally preferable where supported.
