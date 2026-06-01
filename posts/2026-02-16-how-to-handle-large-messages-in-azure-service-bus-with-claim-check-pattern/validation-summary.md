# Validation Summary: How to Handle Large Messages in Azure Service Bus with Claim Check Pattern

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Service Bus
- Azure Blob Storage
- Claim Check pattern
- Bicep / Azure Resource Manager templates
- C# / .NET
- Azure.Messaging.ServiceBus
- Azure.Storage.Blobs
- Azure Storage SAS tokens
- Azure Blob Storage lifecycle management

## Sources Consulted
- Microsoft Learn: Azure Service Bus quotas and limits - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas
- Microsoft Learn: Azure Service Bus Premium messaging tier - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-premium-messaging
- Microsoft Learn: Claim-Check pattern - https://learn.microsoft.com/en-us/azure/architecture/patterns/claim-check
- Microsoft Learn: Microsoft.ServiceBus/namespaces 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces
- Microsoft Learn: Microsoft.ServiceBus/namespaces/queues 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces/queues
- Microsoft Learn: Microsoft.Storage/storageAccounts/blobServices/containers 2023-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts/blobservices/containers
- Microsoft Learn: Azure.Messaging.ServiceBus ServiceBusProcessorOptions - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.servicebusprocessoroptions
- Microsoft Learn: ProcessMessageEventArgs.CompleteMessageAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.processmessageeventargs.completemessageasync
- Microsoft Learn: BlobClient.UploadAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.blobclient.uploadasync
- Microsoft Learn: BlobBaseClient.DownloadContentAsync - https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blobbaseclient.downloadcontentasync
- Microsoft Learn: Create a service SAS for a container or blob with .NET - https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-create-dotnet
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure - https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure Service Bus pricing page - https://azure.microsoft.com/en-us/pricing/details/service-bus/

## Issues Found
- The post stated that Premium Service Bus messages can go up to 100 MB without caveats. Microsoft documents that this is for single AMQP messages, and Premium entities default to a smaller max message size unless configured for larger messages. Updated the sentence to include the AMQP and entity-configuration caveat.
- The Bicep sample used a fixed Service Bus namespace name, but Service Bus namespace names must be unique across Azure. Updated the sample to generate a unique namespace name from the resource group ID.
- The Bicep sample used an older preview API version for Service Bus namespace and queue resources. Updated both resources to the current stable 2024-01-01 API version.
- The SAS snippet used BlobSasBuilder and BlobSasPermissions without the required namespace import. Added `using Azure.Storage.Sas;` to the snippet.

## Review Notes
The code examples are illustrative and assume the container already exists from the infrastructure template. The consumer downloads the whole blob into memory, which is acceptable for a simple tutorial but should be streamed for very large payloads in production. The Bicep CLI is not installed in the workspace, so local compilation was not run; schema fields were checked against Microsoft Learn ARM/Bicep references.
