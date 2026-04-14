# Validation Summary: How to Implement Multi-Service Orchestration Workflow with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (.NET SDK)
- Dapr Service Invocation
- C# / .NET
- Dapr HTTP API (workflow status)

## Sources Consulted
- Dapr Workflow authoring docs: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow patterns (fan-out/fan-in): https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr .NET SDK Workflow source (Workflow base class): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/Workflow.cs
- Dapr .NET SDK WorkflowActivity source: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowActivity.cs
- Dapr .NET SDK WorkflowRetryPolicy source: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowRetryPolicy.cs
- Dapr .NET SDK WorkflowTaskOptions source: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow.Abstractions/WorkflowTaskOptions.cs
- Dapr .NET SDK DaprClient.InvokeMethodAsync source: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- Dapr .NET SDK OrderProcessingWorkflow example: https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Workflows/OrderProcessingWorkflow.cs

## Issues Found

1. **`[DaprWorkflow]` attribute does not exist.** The blog post decorated the workflow class with `[DaprWorkflow]`, but this attribute does not exist in the Dapr .NET SDK. Workflows are registered via `options.RegisterWorkflow<T>()` on `WorkflowRuntimeOptions`, not through attributes. Removed the attribute.

2. **`[DaprWorkflowActivity]` attribute does not exist.** The blog post decorated the activity class with `[DaprWorkflowActivity]`, but this attribute does not exist in the Dapr .NET SDK. Activities are registered via `options.RegisterActivity<T>()`. Removed the attribute.

3. **Workflow status API endpoint had incorrect `/status` suffix.** The blog post used `GET /v1.0/workflows/dapr/checkout-001/status`, but the correct Dapr API endpoint is `GET /v1.0/workflows/dapr/{instanceId}` with no `/status` suffix. Fixed the URL.

4. **Workflow status response format was incorrect.** The blog post showed `output` as a top-level JSON field, but the actual Dapr workflow status response nests the workflow output inside a `properties` map under the key `dapr.workflow.output` (as a JSON-encoded string). The response also includes `workflowName`, `createdAt`, `lastUpdatedAt`, and `properties` fields. Updated the example response to match the actual API format.

## Review Notes
- The `WorkflowTaskOptions` usage with object initializer syntax (`new WorkflowTaskOptions { RetryPolicy = ... }`) is technically valid since `WorkflowTaskOptions` is a C# record with init-only properties. However, all official Dapr examples use the constructor form `new WorkflowTaskOptions(new WorkflowRetryPolicy(...))`. This is a style difference, not a correctness issue, so it was left as-is.
- The `Workflow<TInput, TOutput>` base class, `WorkflowActivity<TInput, TOutput>` base class, `CallActivityAsync` method signatures, `DaprClient.InvokeMethodAsync` parameter names, and `Task.WhenAll` parallel execution pattern are all correct.
- The `WorkflowRetryPolicy` constructor parameter names (`maxNumberOfAttempts`, `firstRetryInterval`, `backoffCoefficient`) are all correct.
