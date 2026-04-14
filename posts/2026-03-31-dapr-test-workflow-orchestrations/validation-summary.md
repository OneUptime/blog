# Validation Summary: How to Test Dapr Workflow Orchestrations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (.NET SDK / `Dapr.Workflow` package)
- C# / .NET
- xUnit test framework
- Moq mocking library
- Dapr CLI (`dapr run`)

## Sources Consulted
- Dapr .NET SDK source code (`dapr/dotnet-sdk` on GitHub) — `DaprWorkflowClient`, `WorkflowContext`, `WorkflowState`, `WorkflowRuntimeStatus` definitions
- Dapr Workflow .NET SDK API: `src/Dapr.Workflow.Abstractions/WorkflowContext.cs` — confirmed `CallActivityAsync` signatures and mockability (abstract class with virtual/abstract methods)
- Dapr Workflow .NET SDK API: `DaprWorkflowClient` — confirmed `ScheduleNewWorkflowAsync` and `GetWorkflowStateAsync` method signatures
- Dapr Workflow .NET SDK API: `WorkflowState` — confirmed `RuntimeStatus` is `WorkflowRuntimeStatus` enum, and `ReadOutputAs<T>()` exists
- Dapr Workflow .NET SDK Attributes: `src/Dapr.Workflow.Abstractions/Attributes/WorkflowAttribute.cs` — confirmed `[Workflow]` exists but `[DaprWorkflow]` does not

## Issues Found

1. **`[DaprWorkflow]` attribute does not exist**: The workflow class was decorated with `[DaprWorkflow]`, which is not a real attribute in the Dapr .NET SDK. The SDK has a `[Workflow]` attribute in `Dapr.Workflow.Abstractions`, but workflows are primarily registered programmatically via `services.AddDaprWorkflow(options => { options.RegisterWorkflow<T>(); })`. Removed the attribute.

2. **Integration test used `DaprClient` instead of `DaprWorkflowClient`**: The `DaprClient` class has no workflow methods at all. The integration test called `_daprClient.StartWorkflowAsync(...)` and `_daprClient.GetWorkflowAsync(...)`, neither of which exist. Changed to `_workflowClient.ScheduleNewWorkflowAsync(...)` and `_workflowClient.GetWorkflowStateAsync(...)` using the correct `DaprWorkflowClient` API.

3. **`StartWorkflowAsync` does not exist**: Replaced with `ScheduleNewWorkflowAsync(name, instanceId, input)`, which is the actual method on `DaprWorkflowClient`.

4. **`GetWorkflowAsync` does not exist and had wrong parameters**: The blog called `GetWorkflowAsync(instanceId, "dapr", nameof(OrderFulfillmentWorkflow))` with three string arguments. This method does not exist. Replaced with `GetWorkflowStateAsync(instanceId, getInputsAndOutputs: true)`. The `getInputsAndOutputs: true` parameter is required for `ReadOutputAs<T>()` to work.

5. **`RuntimeStatus` compared as string instead of enum**: `WorkflowState.RuntimeStatus` is of type `WorkflowRuntimeStatus` (an enum), not a string. Changed `is "COMPLETED" or "FAILED"` to `is WorkflowRuntimeStatus.Completed or WorkflowRuntimeStatus.Failed`, and changed `Assert.Equal("COMPLETED", ...)` to `Assert.Equal(WorkflowRuntimeStatus.Completed, ...)`.

## Review Notes
- `DaprWorkflowClient` also provides `WaitForWorkflowCompletionAsync(instanceId)` which could replace the manual polling loop. The polling approach shown is still valid and educational, but readers may prefer the simpler built-in method.
- The unit test mock setups pass an explicit `null` third argument for the `WorkflowTaskOptions?` parameter of `CallActivityAsync`. This is correct — the compiler inserts `null` for the default parameter, so Moq matches it properly.
- `WorkflowContext` is an abstract class with abstract/virtual methods, confirming the Moq-based unit testing approach is valid.
