# Validation Summary: How to Implement Retry Workflow with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- Dapr .NET SDK (`Dapr.Workflow` package)
- C# / .NET

## Sources Consulted
- Dapr .NET SDK source code: https://github.com/dapr/dotnet-sdk
  - `WorkflowRetryPolicy.cs` — constructor parameters and retry logic
  - `WorkflowTaskOptions.cs` — record definition and properties
  - `Workflow.cs` / `WorkflowActivity.cs` — base class signatures
  - `WorkflowContext.cs` — `CallActivityAsync<T>` method signature
  - `WorkflowAttribute.cs` / `WorkflowActivityAttribute.cs` — actual attribute names
  - `DaprWorkflowClient.cs` — current workflow scheduling API
  - `RetryInterceptor.cs` — retry behavior for exceptions
  - `WorkflowServiceCollectionExtensions.cs` — DI registration methods
- Dapr Workflow documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/
- Dapr .NET SDK Workflow docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/

## Issues Found

### 1. Incorrect attribute names `[DaprWorkflow]` and `[DaprWorkflowActivity]`
**What was wrong:** The post used `[DaprWorkflow]` on the workflow class and `[DaprWorkflowActivity]` on the activity class. These attributes do not exist in the Dapr .NET SDK. The actual attributes are `[Workflow]` and `[WorkflowActivity]` (in namespace `Dapr.Workflow.Abstractions.Attributes`), and they are optional — used only for source generators, not required for registration.
**What was changed:** Removed both attributes from the code examples since the post already demonstrates manual registration via `AddDaprWorkflow`, making the attributes unnecessary.
**Why:** Using non-existent attribute names would cause compilation errors. Since the post covers explicit DI registration, the attributes add no value and their removal simplifies the examples.

### 2. Deprecated/removed `DaprClient.StartWorkflowAsync` API
**What was wrong:** The post used `await daprClient.StartWorkflowAsync(workflowComponent: "dapr", workflowName: ..., instanceId: ..., input: ...)`. This API existed on `DaprClient` in older SDK versions (v1.13.0) but was marked obsolete and has been removed in current SDK versions (v1.17.x).
**What was changed:** Updated to the current API: `await daprWorkflowClient.ScheduleNewWorkflowAsync(name: ..., instanceId: ..., input: ...)` using `DaprWorkflowClient` instead of `DaprClient`. Also updated the accompanying text from "Dapr client" to "Dapr workflow client".
**Why:** The old API would not compile against current SDK versions. The `workflowComponent` parameter is no longer needed.

### 3. Incorrect non-retryable error handling guidance
**What was wrong:** The post claimed that throwing a non-transient exception (like `InvalidOperationException`) would prevent Dapr from retrying the activity. This is incorrect. The Dapr Workflow retry policy retries ALL thrown exceptions regardless of type (only `OutOfMemoryException` and `StackOverflowException` are treated as fatal in the retry interceptor). The original code example would still be retried up to `maxNumberOfAttempts` times.
**What was changed:** Rewrote the "Handling Non-Retryable Errors" section to explain that Dapr retries all exceptions, and changed the code example to catch the business logic exception and return a failure value (`false`) instead of re-throwing. Updated the Summary section accordingly.
**Why:** The original guidance would mislead readers into thinking exception types control retry behavior, when in reality only catching exceptions and returning failure values prevents unnecessary retries.

## Review Notes
- The `WorkflowRetryPolicy` constructor also accepts an optional `retryTimeout` parameter (overall timeout for all retry attempts) that the post does not mention. This is a minor omission, not an error — the post covers the most commonly used parameters.
- The `WorkflowTaskOptions` is defined as a C# `record`, not a `class`. The blog's property-initialization syntax (`new WorkflowTaskOptions { RetryPolicy = ... }`) still works with records, so this is not an error.
- The `maxRetryInterval` parameter is nullable (`TimeSpan?`) in the actual API. The blog passes it as a non-nullable `TimeSpan` which is implicitly converted, so this works correctly.
