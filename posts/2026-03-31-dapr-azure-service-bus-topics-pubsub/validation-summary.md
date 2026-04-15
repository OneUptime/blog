# Validation Summary: How to Configure Dapr with Azure Service Bus Topics Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Service Bus Topics
- Azure CLI
- Python / Flask (subscriber examples)
- YAML (Dapr component and subscription configuration)

## Sources Consulted
- [Azure Service Bus Topics | Dapr Docs](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/) — component type, metadata fields, consumerID/app-id behavior
- [Pub/sub API reference | Dapr Docs](https://docs.dapr.io/reference/api/pubsub_api/) — publish endpoint format
- [Subscription spec | Dapr Docs](https://docs.dapr.io/reference/resource-specs/subscription-schema/) — declarative subscription YAML format and API versions
- [Declarative, streaming, and programmatic subscription types | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/) — v1alpha1 vs v2alpha1 deprecation
- [Publishing & subscribing messages with CloudEvents | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/) — CloudEvents envelope and `data` field
- [az servicebus namespace CLI Reference](https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace?view=azure-cli-latest)
- [az servicebus topic CLI Reference](https://learn.microsoft.com/en-us/cli/azure/servicebus/topic?view=azure-cli-latest)
- [az servicebus topic subscription CLI Reference](https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription?view=azure-cli-latest)
- [az servicebus topic subscription rule CLI Reference](https://learn.microsoft.com/en-us/cli/azure/servicebus/topic/subscription/rule?view=azure-cli-latest)
- [Azure Service Bus Queues, Topics, and Subscriptions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions) — Standard tier requirement for topics

## Issues Found
- **Deprecated declarative subscription API version**: The declarative subscription YAML used `apiVersion: dapr.io/v1alpha1` with `spec.route`, which is now deprecated. Updated to `apiVersion: dapr.io/v2alpha1` with `spec.routes.default` to match the current recommended format.

## Review Notes
- All Azure CLI commands (`az servicebus namespace create`, `az servicebus topic create`, `az servicebus topic subscription create`, `az servicebus topic subscription rule create`) use correct flags and syntax.
- The Dapr component type `pubsub.azure.servicebus.topics` and all metadata fields (`connectionString`, `maxConcurrentHandlers`, `prefetchCount`, `maxActiveMessages`, `defaultMessageTimeToLiveInSec`) are valid.
- The publish API endpoint format `/v1.0/publish/{pubsubname}/{topic}` is correct.
- The Python Flask subscriber code correctly accesses the CloudEvents `data` field and returns HTTP 200 to acknowledge processing.
- The claim that Dapr creates separate Service Bus subscriptions per `app-id` is accurate (the `consumerID` defaults to the app ID).
- The claim that Azure Service Bus Standard tier is the minimum for topics is correct (Basic tier supports queues only).
- The `az servicebus namespace create` command omits `--location`, which will use the Azure CLI default location. This is acceptable but readers may want to specify it explicitly.
