# Validation Summary: How to Use Dapr Pub/Sub Messaging with Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Dapr pub/sub
- Azure Service Bus Topics
- Azure CLI
- JavaScript
- Express
- CloudEvents
- Dapr subscriptions and resiliency policies

## Sources Consulted
- Azure Container Apps Dapr components documentation: https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Azure CLI `az containerapp env dapr-component` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/env/dapr-component
- Azure CLI `az servicebus namespace` reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace
- Azure CLI `az servicebus namespace authorization-rule` reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace/authorization-rule
- Dapr Azure Service Bus Topics component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr publish and subscribe overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr subscription methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr dead letter topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/

## Issues Found
- The Express subscriber examples used `express.json()` with the default media type handling. Dapr delivers wrapped pub/sub messages as CloudEvents, and official Dapr JavaScript examples parse `application/*+json`. Updated the examples to parse both `application/json` and `application/*+json`.
- The post described dead-letter handling as "dead letter queues" in the Dapr feature list. Dapr documents this feature as dead letter topics, so the wording was corrected.
- The dead-letter configuration example used `deadLetteringOnMessageExpiration` as Dapr component metadata. That is not a Dapr Azure Service Bus Topics component metadata field. Replaced the example with the supported Dapr `deadLetterTopic` subscription configuration.
- The post implied Dapr forwards to a dead letter topic only after a maximum retry count by default. Dapr sends failed messages to the dead letter topic immediately unless a retry resiliency policy is configured. Added a minimal resiliency policy example.
- The troubleshooting section told readers to check the Azure Service Bus dead letter queue for dead-lettered Dapr messages. Updated it to distinguish Dapr `deadLetterTopic` routing from Azure Service Bus broker-level dead lettering.

## Review Notes
The Azure CLI commands and Azure Container Apps Dapr component schema match current Microsoft documentation. The Dapr pub/sub publish URL, subscription formats, at-least-once delivery behavior, CloudEvents wrapping, and Azure Service Bus Topics component metadata are consistent with current Dapr documentation.
