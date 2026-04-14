# Validation Summary: How to Build a Supply Chain Management System with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Workflows (.NET SDK)
- Dapr State Management
- Dapr Pub/Sub
- Dapr Service Invocation
- Dapr Multi-App Run
- ASP.NET Core Minimal APIs
- C# / .NET

## Sources Consulted
- Dapr Workflow authoring guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr .NET SDK client documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr Pub/Sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Multi-App Run template documentation: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr State Management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/

## Issues Found
1. **Removed non-existent `[WorkflowName]` attribute**: The post used `[WorkflowName("OrderFulfillmentWorkflow")]` on the workflow class, but this attribute does not exist in the Dapr .NET SDK. Dapr workflows are identified by their class name when registered via `options.RegisterWorkflow<OrderFulfillmentWorkflow>()`. Removed the attribute to prevent a compilation error.

## Review Notes
- The inventory reservation in `ReserveInventory` uses a read-modify-write pattern without ETags or concurrency control. In a real production system, this could lead to race conditions. This is acceptable for a tutorial but worth noting for readers building production systems.
- The `DaprClient` is instantiated inline with `new DaprClientBuilder().Build()` in the `ReserveInventory` method. In production, dependency injection is preferred. Again, acceptable for tutorial brevity.
- The Supplier Service is listed in the architecture but not included in the `dapr.yaml` multi-app run config. This is a minor omission but doesn't affect technical correctness of the examples shown.
