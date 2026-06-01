# Validation Summary: How to Configure Azure Service Bus Geo-Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Service Bus
- Azure Service Bus Geo-Disaster Recovery
- Azure Service Bus Geo-Replication
- Azure CLI
- Azure Resource Manager / Bicep
- Azure.Messaging.ServiceBus for .NET

## Sources Consulted
- Microsoft Learn: Azure Service Bus Geo-Disaster Recovery Guide - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-geo-dr
- Microsoft Learn: Azure Service Bus Geo-Replication - https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-geo-replication
- Microsoft Learn: Reliability in Azure Service Bus - https://learn.microsoft.com/en-us/azure/reliability/reliability-service-bus
- Microsoft Learn: az servicebus georecovery-alias - https://learn.microsoft.com/en-us/cli/azure/servicebus/georecovery-alias
- Microsoft Learn: az servicebus georecovery-alias authorization-rule keys - https://learn.microsoft.com/en-us/cli/azure/servicebus/georecovery-alias/authorization-rule/keys
- Microsoft Learn: az servicebus namespace - https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace
- Microsoft Learn: Microsoft.ServiceBus/namespaces Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces
- Microsoft Learn: Microsoft.ServiceBus/namespaces/queues Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces/queues
- Microsoft Learn: Microsoft.ServiceBus/namespaces/disasterRecoveryConfigs Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2024-01-01/namespaces/disasterrecoveryconfigs

## Issues Found
- The post described Geo-DR accurately as metadata-only replication, but did not distinguish it from the newer Azure Service Bus Geo-Replication feature. Added a short clarification that Geo-Replication replicates message data and is recommended by Microsoft for most disaster recovery scenarios where message loss is not acceptable.
- The Bicep examples used the older `2022-10-01-preview` Service Bus API version. Updated the namespace, queue, and disaster recovery configuration resources to the stable `2024-01-01` API version.
- The re-pairing section incorrectly said the old primary could be cleared and reused as the new secondary, and the testing section said to fail back. Microsoft documents Geo-DR as fail-forward only and says you cannot fail back to the previous primary replica. Updated the section to create a new empty Premium namespace as the next secondary and removed the failback instruction.

## Review Notes
- The Azure CLI examples match the current documented command groups and parameters, including `az servicebus georecovery-alias set`, `show`, `fail-over`, and `authorization-rule keys list`.
- The .NET example uses the current `Azure.Messaging.ServiceBus` client shape (`ServiceBusClient`, `CreateSender`, `SendMessageAsync`, and `ServiceBusMessage`) and is technically valid as a focused snippet.
- The local environment did not have the Azure CLI or Bicep CLI installed, so command verification was performed against current Microsoft Learn CLI and ARM/Bicep reference documentation.
