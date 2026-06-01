# Validation Summary: How to Build a Dynamics 365 Plugin That Writes to Azure Service Bus Topics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Dynamics 365 / Microsoft Dataverse plug-ins
- Microsoft Dataverse Azure Service Bus integration
- Azure Service Bus topics and subscriptions
- Azure Service Bus SQL filters
- Azure Functions Service Bus trigger
- Azure CLI
- C#

## Sources Consulted
- Microsoft Learn: Azure Service Bus Integration for Dataverse - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/azure-integration
- Microsoft Learn: Work with Microsoft Dataverse data in your Azure solution - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/work-data-azure-solution
- Microsoft Learn: Sample: Azure aware custom plug-in - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/samples/azure-aware-custom-plugin
- Microsoft Learn: Service Endpoint table/entity reference - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/serviceendpoint
- Microsoft Learn: Access external web services from Dataverse plug-ins - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/access-web-services
- Microsoft Learn: Event Framework in Microsoft Dataverse - https://learn.microsoft.com/en-us/power-apps/developer/data-platform/event-framework
- Microsoft Learn: Azure Service Bus topic filters and actions - https://learn.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
- Microsoft Learn: Azure Service Bus trigger for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Microsoft Learn: az servicebus topic subscription - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription
- Microsoft Learn: az servicebus topic subscription rule - https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription/rule

## Issues Found
- The introduction incorrectly said sandboxed Dynamics 365 plug-ins cannot make arbitrary HTTP calls. Microsoft documents that HTTP and HTTPS calls are supported with sandbox restrictions. Updated the wording to describe the restriction accurately.
- The programmatic `serviceendpoint` example used incorrect option values: `contract = 7` is Event Hub, not Topic, and `messageformat = 1` is binary XML, not JSON. Updated the values to `contract = 5` and `messageformat = 2`, and added relevant service endpoint fields for SAS and namespace configuration.
- The plug-in code built a custom payload but then posted the Dataverse execution context with `IServiceEndpointNotificationService.Execute`. The payload code was also incomplete because `SerializableDictionary` was undefined and serialization attributes were missing imports. Removed the unused custom payload and aligned the sample with the documented Azure-aware plug-in pattern.
- The step registration text said Post-Operation means the Dynamics transaction has already committed. Synchronous PostOperation runs within the database transaction; asynchronous PostOperation runs after the record operation completes. Updated the wording for the recommended asynchronous registration.
- The Service Bus SQL filter example attempted to filter on `EntityName` from the JSON body. Service Bus SQL filters evaluate message properties, not message body fields. Removed the invalid rule command and explained that routing should be done with endpoint/topic design or in the consumer for Dataverse execution context payloads.
- The Azure Function snippet omitted common using directives and dependency injection setup for `_erpClient`. Added the imports and constructor needed for the sample shape.
- The Azure CLI subscription update used an outdated/incorrect flag for dead-lettering on message expiration. Updated it to `--enable-dead-lettering-on-message-expiration true`.
- The wrapping-up paragraph still claimed SQL filters ensured each consumer processes only matching Dataverse events. Updated it to match the corrected routing guidance.

## Review Notes
The post is technically valid after correction. The Azure Function sample still assumes an application-specific `IErpClient` abstraction and the referenced NuGet packages/imports are present, which is appropriate for a focused blog snippet but should be called out if the article is expanded into a complete runnable project.
