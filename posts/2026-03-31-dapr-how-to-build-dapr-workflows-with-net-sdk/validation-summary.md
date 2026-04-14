# Validation Summary: How to Build Dapr Workflows with .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow runtime
- Dapr .NET SDK (`Dapr.Workflow` NuGet package)
- C# / .NET (records, async/await, Task.WhenAll)
- Microsoft.Extensions.Hosting (Generic Host)
- Dapr HTTP API for workflow management
- Redis as actor state store
- Docker (for Redis)

## Sources Consulted
- Dapr .NET SDK source code on GitHub (https://github.com/dapr/dotnet-sdk) — verified `Workflow<TInput, TOutput>`, `WorkflowActivity<TInput, TOutput>`, `WorkflowContext`, `WorkflowActivityContext`, `WorkflowTaskOptions`, `WorkflowRetryPolicy`, `DaprWorkflowClient`, and `WorkflowState` APIs
- Dapr Workflow documentation (https://docs.dapr.io/developing-applications/building-blocks/workflow/) — verified registration pattern, orchestrator/activity model, and HTTP API endpoints
- Dapr Workflow HTTP API reference (https://docs.dapr.io/reference/api/workflow_api/) — verified correct URL paths for GET, terminate, pause, and resume operations
- NuGet package listing for Dapr.Workflow — confirmed package name and transitive dependencies

## Issues Found

1. **Invalid NuGet package in project setup**: The post included `dotnet add package Microsoft.AspNetCore.App` in the setup commands. `Microsoft.AspNetCore.App` is a shared framework reference automatically available in web SDK projects, not a standalone NuGet package. The NuGet package was deprecated at version 2.2.8 and `dotnet add package` will fail or produce warnings on modern .NET. Removed this line since Dapr.Workflow does not require it.

2. **Non-existent property `SerializedCustomStatus`**: The post used `state.SerializedCustomStatus` when polling workflow state. The `WorkflowState` class does not have a `SerializedCustomStatus` property. The correct API is `state.ReadCustomStatusAs<T>()`, which deserializes the custom status to the specified type. Changed to `state.ReadCustomStatusAs<string>()`.

3. **Incorrect HTTP API endpoint paths**: All four HTTP API examples incorrectly included the workflow type name (`OrderProcessingOrchestrator`) in the URL path. The Dapr Workflow HTTP API format for GET, terminate, pause, and resume is `/v1.0/workflows/{componentName}/{instanceId}` — only the Start endpoint includes the workflow type name. Removed `OrderProcessingOrchestrator/` from all four URLs.

## Review Notes
- The `WorkflowTaskOptions` is defined as a positional record in the SDK (`WorkflowTaskOptions(WorkflowRetryPolicy? RetryPolicy = null, string? TargetAppId = null)`). The blog post uses object initializer syntax (`new WorkflowTaskOptions { RetryPolicy = ... }`) which is valid since positional records generate init-only properties.
- The `SetCustomStatus` method accepts `object?`, not just `string`. The blog passes strings which is valid, but readers should know any serializable object can be used.
- The `CreateShipmentActivity` uses `DateTime.UtcNow` and `Random.Shared` inside an activity, which is acceptable since activities (unlike orchestrators) are not subject to determinism constraints.
- The fan-out/fan-in pattern using `Task.WhenAll` on multiple `CallActivityAsync` calls is the correct and documented approach for parallel execution in Dapr workflows.
- The state store component correctly sets `actorStateStore: "true"`, which is required since Dapr workflows are built on the actor runtime internally.
