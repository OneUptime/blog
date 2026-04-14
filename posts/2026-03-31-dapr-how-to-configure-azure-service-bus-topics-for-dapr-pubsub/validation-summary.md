# Validation Summary: How to Configure Azure Service Bus Topics for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Service Bus Topics
- Azure CLI
- Azure Managed Identity (Microsoft Entra ID)
- Dapr .NET SDK (C# publisher)
- Python Flask (subscriber)
- Kubernetes (secrets, AKS)

## Sources Consulted
- Dapr Azure Service Bus Topics component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr subscription methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr .NET SDK source (DaprClient.cs PublishEventAsync signatures): https://github.com/dapr/dotnet-sdk
- Azure CLI Service Bus reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription

## Issues Found

1. **Removed non-existent `prefetchCount` metadata field.** The Dapr Azure Service Bus Topics component does not have a `prefetchCount` metadata field. Removed it from the component configuration YAML. The `maxActiveMessages` field (which was already present) serves the message buffering purpose.

2. **Replaced invalid Azure CLI dead-letter command.** The command `az servicebus topic subscription message receive` does not exist in the Azure CLI — there is no `message` subgroup under `az servicebus topic subscription`. Replaced the CLI-based dead-letter viewing approach with a reference to Azure Portal's Service Bus Explorer.

3. **Fixed dead letter subscription to use Dapr's `deadLetterTopic` mechanism.** The original used `topic: orders/$DeadLetterQueue` in a Dapr Subscription CRD, which is not a valid Dapr pattern. The `$DeadLetterQueue` is an Azure Service Bus native sub-queue concept, not a Dapr topic. Replaced with the correct Dapr approach: adding `deadLetterTopic: orders-deadletter` to the main subscription and creating a separate subscription to that dead letter topic.

4. **Added missing `requireSessions: "true"` metadata to sessions section.** The Dapr component requires `requireSessions` to be explicitly set to `"true"` to enable session support. Setting only `sessionIdleTimeoutInSec` does not implicitly enable sessions.

5. **Fixed summary reference from `prefetchCount` to `maxActiveMessages`.** Updated the closing summary to reference the correct metadata field name.

## Review Notes
- The `autoDeleteOnIdleInSec` value of `"300"` (5 minutes) is the minimum allowed by Azure Service Bus. While technically valid, this is aggressive for production — idle subscriptions will be auto-deleted after just 5 minutes. Authors may want to increase this or note the trade-off.
- The C# publisher and Python subscriber use different naming conventions (`OrderId` in C# vs `orderId` in Python). This works correctly because the Dapr .NET SDK uses `JsonSerializerDefaults.Web` which serializes properties as camelCase by default.
- The programmatic subscription format using a flat `route` field (instead of the `routes` object with `rules`/`default`) is valid for simple single-route subscriptions.
- Azure CLI commands for resource group creation, namespace creation, connection string retrieval, AKS identity setup, and RBAC role assignment are all correct.
- The managed identity component correctly uses the FQDN format for `namespaceName` (e.g., `sb-dapr-demo-001.servicebus.windows.net`).
