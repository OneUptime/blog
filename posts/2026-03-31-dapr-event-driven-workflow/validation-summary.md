# Validation Summary: How to Implement Event-Driven Workflow with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (.NET SDK)
- Dapr Pub/Sub
- ASP.NET Core
- C#

## Sources Consulted
- Dapr .NET SDK source code on GitHub (`dapr/dotnet-sdk`) — `src/Dapr.Workflow.Abstractions/WorkflowContext.cs`, `src/Dapr.Workflow/DaprWorkflowClient.cs`, `src/Dapr.Workflow/WorkflowServiceCollectionExtensions.cs`
- Dapr .NET SDK `src/Dapr.AspNetCore/TopicAttribute.cs` for pub/sub attribute verification
- Dapr .NET SDK examples (`WorkflowExternalInteraction` sample) for `WaitForExternalEventAsync` timeout and `TaskCanceledException` behavior
- Dapr .NET SDK `src/Dapr.Workflow.Abstractions/Workflow.cs` for base class verification

## Issues Found
1. **`[DaprWorkflow]` attribute does not exist.** The post decorated the workflow class with `[DaprWorkflow]`, but this attribute does not exist in any version of the Dapr .NET SDK. Workflows are registered at startup via `AddDaprWorkflow()` and `options.RegisterWorkflow<T>()`. Removed the attribute from the code example.

2. **`DaprClient.RaiseWorkflowEventAsync` replaced by `DaprWorkflowClient.RaiseEventAsync`.** The old `DaprClient.RaiseWorkflowEventAsync` method was deprecated and removed from the current SDK. Updated the code to use `DaprWorkflowClient.RaiseEventAsync` with its current parameter names (`instanceId`, `eventName`, `eventPayload`). Also removed the `workflowComponent: "dapr"` parameter which no longer exists.

3. **`DaprClient.StartWorkflowAsync` replaced by `DaprWorkflowClient.ScheduleNewWorkflowAsync`.** The old `DaprClient.StartWorkflowAsync` method was deprecated and removed from the current SDK. Updated the code to use `DaprWorkflowClient.ScheduleNewWorkflowAsync` with its current parameter names (`name`, `instanceId`, `input`). Also removed the `workflowComponent: "dapr"` parameter.

4. **Summary text referenced "Dapr management API".** Updated to reference `DaprWorkflowClient` instead, matching the corrected code examples.

## Review Notes
- The code examples use `_workflowClient` (a `DaprWorkflowClient` instance) instead of the old `_daprClient` (`DaprClient`). In a real application, `DaprWorkflowClient` is injected via dependency injection after calling `AddDaprWorkflow()` in startup. The post does not show the DI registration, but this is acceptable for a focused tutorial.
- The `Task.WhenAny` pattern for competing events is valid and explicitly supported by the Dapr Workflow SDK. However, the "losing" task does not auto-cancel — undelivered external events remain buffered. This is a minor caveat not mentioned in the post but not incorrect.
- The `Workflow<TInput, TOutput>` base class, `RunAsync` method signature, `CallActivityAsync`, `WaitForExternalEventAsync` (with `eventName`/`timeout` parameters and `TaskCanceledException` on timeout), and `[Topic]` attribute are all verified correct.
