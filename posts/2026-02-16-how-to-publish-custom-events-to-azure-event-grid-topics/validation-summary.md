# Validation Summary: How to Publish Custom Events to Azure Event Grid Topics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Grid custom topics
- Azure CLI
- Azure.Messaging.EventGrid for .NET
- azure-eventgrid for Python
- curl and Event Grid REST publishing
- Microsoft Entra ID and managed identity authentication
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Publish events to Azure Event Grid custom topics using access keys - https://learn.microsoft.com/en-us/azure/event-grid/post-to-custom-topic
- Microsoft Learn: Azure Event Grid event schema - https://learn.microsoft.com/en-us/azure/event-grid/event-schema
- Microsoft Learn: Azure CLI az eventgrid topic reference - https://learn.microsoft.com/en-us/cli/azure/eventgrid/topic
- Microsoft Learn: Azure CLI az eventgrid event-subscription reference - https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: Azure Event Grid client library for .NET - https://learn.microsoft.com/en-us/dotnet/api/overview/azure/messaging.eventgrid-readme
- Microsoft Learn: EventGridPublisherClient .NET API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventgrid.eventgridpublisherclient
- Microsoft Learn: Azure Event Grid client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/eventgrid-readme
- Microsoft Learn: azure.eventgrid.EventGridPublisherClient Python API reference - https://learn.microsoft.com/en-us/python/api/azure-eventgrid/azure.eventgrid.eventgridpublisherclient
- Microsoft Learn: Authenticate Event Grid publishing clients using Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/event-grid/authenticate-with-microsoft-entra-id
- Microsoft Learn: Event handlers in Azure Event Grid - https://learn.microsoft.com/en-us/azure/event-grid/event-handlers

## Issues Found
- The Mermaid diagram implied `Orders.*` could be used as an event type wildcard filter. Event Grid's included event type filter matches exact event type names, so I changed the diagram label to `No event type filter` for the analytics subscriber that receives everything.
- The batch publishing comment said a fixed batch size of 500 would stay well under the 1 MB request limit. Event size varies, so a fixed event count cannot guarantee that. I changed the comment to clarify that the batch size must be chosen so each request stays under the 1 MB limit.

## Review Notes
The Azure CLI commands, Event Grid schema example, curl publishing header, C# SDK usage, Python SDK usage, Azure Function subscription endpoint format, managed identity recommendation, and EventGrid Data Sender role guidance align with current Microsoft documentation. The local environment did not have the Azure CLI installed, so CLI verification was performed against Microsoft Learn rather than local `az --help` output.
