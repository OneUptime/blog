# Validation Summary: How to Create Azure Event Grid System Topics for Azure Resource Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Grid system topics
- Azure Event Grid event subscriptions
- Azure CLI
- Bicep / ARM resources
- Azure Functions for .NET isolated worker
- Azure Blob Storage, Azure Key Vault, Azure Resource Manager resource events

## Sources Consulted
- Azure Event Grid system topics: https://learn.microsoft.com/en-us/azure/event-grid/system-topics
- Azure CLI for Event Grid system topics: https://learn.microsoft.com/en-us/cli/azure/eventgrid/system-topic
- Azure CLI for system topic event subscriptions: https://learn.microsoft.com/en-us/cli/azure/eventgrid/system-topic/event-subscription
- Bicep/ARM reference for `Microsoft.EventGrid/systemTopics/eventSubscriptions`: https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/systemtopics/eventsubscriptions
- Azure Blob Storage as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage
- Azure Key Vault as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-key-vault
- Azure resource group as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-resource-groups
- Azure Container Registry as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-container-registry
- Azure IoT Hub as an Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-iot-hub
- Azure Communication Services SMS events: https://learn.microsoft.com/en-us/azure/event-grid/communication-services-telephony-sms-events
- Azure Communication Services chat events: https://learn.microsoft.com/en-us/azure/event-grid/communication-services-chat-events
- Azure Event Grid access control with Azure RBAC: https://learn.microsoft.com/en-us/azure/event-grid/security-authorization
- Managed identities for Event Grid event delivery: https://learn.microsoft.com/en-us/azure/event-grid/managed-service-identity
- Azure Event Grid trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger

## Issues Found
- The Azure Communication Services examples listed "call started", which was not the best-supported example from the Event Grid schema pages consulted. Changed it to "SMS received, delivery reports, chat events" to align with the documented SMS and chat event families.
- The permissions section said that creating a system topic only required read access to the source and contributor access to the system topic resource group. Updated it to mention Event Grid RBAC and the documented `Microsoft.EventGrid/EventSubscriptions/Write` permission requirement at the publishing resource scope for system topic subscriptions.
- The managed identity guidance said the system topic identity needs roles on the source resource, such as `Storage Blob Data Reader` for blob content. Event Grid managed identity is used for delivery to supported destinations, so the paragraph now assigns roles on the destination resource instead.
- The limits section said system topics are always regional and that cross-region event routing is not supported. Updated it to the documented behavior: regional sources create system topics in the same region, while global sources such as subscriptions, resource groups, and Azure Maps use the global location.

## Review Notes
The CLI commands, Bicep resource shape, event type names for Storage, Key Vault, and resource group events, and the Azure Functions Event Grid trigger pattern were consistent with current Microsoft documentation. The Bicep examples use `2022-06-15`, which remains documented, though newer Event Grid API versions are available.
