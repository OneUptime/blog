# Validation Summary: How to Build Microservices with Dapr in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core Web API
- Dapr
- Dapr .NET SDK
- Dapr CLI
- Dapr service invocation
- Dapr pub/sub
- Dapr state management
- Dapr resiliency policies
- Redis
- Kubernetes

## Sources Consulted
- Dapr .NET SDK client documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr pub/sub publish and subscribe guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr state management save/get guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Streams pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr CLI install documentation: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr CLI init command reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr arguments and Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr resiliency overview and spec examples: https://docs.dapr.io/operations/resiliency/resiliency-overview/

## Issues Found
- The local `dapr run` examples used `--components-path`. Current Dapr CLI documentation marks this flag as deprecated in favor of `--resources-path`, so both examples were updated to use `--resources-path ./components`.
- The `AddItemAsync` example described `SaveStateAsync` as saving with optimistic concurrency using ETags. Plain `SaveStateAsync` saves state without an ETag; the ETag-based concurrency example appears separately with `GetStateAndETagAsync` and `TrySaveStateAsync`. The comment was changed to describe a normal state save.
- The `dapr init` comment only mentioned Redis and Zipkin. Current Dapr initialization also installs the runtime and other default development containers, so the comment was made more accurate without changing the command.

## Review Notes
The examples are illustrative and omit surrounding domain types such as `Product`, `Order`, `OrderRepository`, and `CreateOrderRequest`; this is acceptable for a focused Dapr tutorial. The Redis component examples use inline empty passwords, which matches local development examples but should be replaced with secret references for production deployments.
