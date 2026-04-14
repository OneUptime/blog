# Validation Summary: How to Implement Sub-Workflow Pattern with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow SDK (.NET / C#)
- Dapr sub-workflow (child workflow) pattern
- ASP.NET Core dependency injection (service registration)

## Sources Consulted
- Dapr .NET SDK source code (`dapr/dotnet-sdk`), specifically:
  - `src/Dapr.Workflow.Abstractions/WorkflowContext.cs` — `CallChildWorkflowAsync` and `CallActivityAsync` signatures
  - `src/Dapr.Workflow.Abstractions/Workflow.cs` — `Workflow<TInput, TOutput>` base class
  - `src/Dapr.Workflow.Abstractions/WorkflowTaskOptions.cs` — `ChildWorkflowTaskOptions` record definition
  - `src/Dapr.Workflow.Abstractions/Attributes/WorkflowAttribute.cs` — only workflow attribute in the SDK
  - `src/Dapr.Workflow/WorkflowRuntimeOptions.cs` — `RegisterWorkflow` and `RegisterActivity` methods
  - `src/Dapr.Workflow/WorkflowServiceCollectionExtensions.cs` — `AddDaprWorkflow` extension method
  - `examples/Workflow/WorkflowSubworkflow/Program.cs` — official sub-workflow example
- Dapr official documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/

## Issues Found
1. **`[DaprWorkflow]` attribute does not exist.** The blog applied `[DaprWorkflow]` to all three workflow classes (`PaymentWorkflow`, `ShipmentWorkflow`, `OrderWorkflow`). This attribute does not exist in the Dapr .NET SDK. The correct way to define a workflow is simply to inherit from `Workflow<TInput, TOutput>` — no attribute is required. The SDK does have a `[Workflow]` attribute (`WorkflowAttribute`) used internally for source generators, but it is not needed and not used in any official examples. **Fix:** Removed all three `[DaprWorkflow]` annotations.

2. **`ChildWorkflowOptions` should be `ChildWorkflowTaskOptions`.** The blog used `new ChildWorkflowOptions { InstanceId = childInstanceId }` when passing a custom instance ID to a child workflow. The correct class name is `ChildWorkflowTaskOptions`, defined as a C# record in the SDK. **Fix:** Changed `ChildWorkflowOptions` to `ChildWorkflowTaskOptions`.

## Review Notes
- The overall pattern and approach described (parent workflow calling child workflows via `CallChildWorkflowAsync`, registration with `AddDaprWorkflow`, deterministic instance IDs) are correct and align with official Dapr examples.
- The `CallActivityAsync` and `CallChildWorkflowAsync` method signatures used in the blog match the actual SDK API.
- The workflow registration pattern (`options.RegisterWorkflow<T>()` / `options.RegisterActivity<T>()`) is correct.
