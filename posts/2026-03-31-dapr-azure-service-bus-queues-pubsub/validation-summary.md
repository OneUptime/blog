# Validation Summary: How to Configure Dapr with Azure Service Bus Queues Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Service Bus Queues
- Azure CLI
- Kubernetes (secrets, CRDs)
- Java / Spring Boot
- Azure Monitor (metrics alerts)

## Sources Consulted
- Dapr Azure Service Bus Queues pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-queues/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Publish API: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Azure CLI `az servicebus namespace create` docs: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace
- Azure CLI `az servicebus queue create` docs: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue
- Azure CLI `az monitor metrics alert create` docs: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Service Bus metrics reference: https://learn.microsoft.com/en-us/azure/service-bus-messaging/monitor-service-bus-reference
- Spring Framework `ResponseEntity` API docs

## Issues Found
1. **Missing Java import for `ResponseEntity`**: The Java code example was missing `import org.springframework.http.ResponseEntity;`. The `ResponseEntity` class is in the `org.springframework.http` package, not covered by the `org.springframework.web.bind.annotation.*` wildcard import. This would cause a compilation error. **Fixed** by adding the missing import.

2. **Incorrect Azure Monitor metric name**: The `az monitor metrics alert create` command used `DeadLetteredMessageCount` as the metric name. The correct Azure Service Bus metric name is `DeadletteredMessages`. **Fixed** by replacing with the correct metric name.

## Review Notes
- The Subscription CRD uses `apiVersion: dapr.io/v1alpha1` which is the older version. The current recommended version is `dapr.io/v2alpha1` with `routes` (plural) instead of `route`. The v1alpha1 format still works for backward compatibility, but may be deprecated in a future Dapr release.
- The `--scopes` value in the monitor alert command uses a placeholder path (`/subscriptions/.../dapr-servicebus`). This is acceptable for a tutorial but readers will need to substitute their actual resource ID.
- The `--window-size 5m` and `--evaluation-frequency 1m` values in the monitor alert happen to be the defaults, so they could be omitted, but including them explicitly is good practice for clarity.
