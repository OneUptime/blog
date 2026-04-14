# Validation Summary: How to Migrate from AWS Step Functions to Dapr Workflow

## Status
validated

## Post Type
Migration Guide / Tutorial

## Technologies Covered
- AWS Step Functions (Amazon States Language)
- Dapr Workflow (.NET SDK)
- C# / .NET
- Dapr CLI

## Sources Consulted
- Dapr .NET SDK source code and examples (github.com/dapr/dotnet-sdk)
- Dapr Workflow documentation (docs.dapr.io/developing-applications/building-blocks/workflow/)
- Dapr Workflow .NET SDK API reference — `Workflow<TInput, TOutput>`, `WorkflowContext`, `DaprWorkflowClient`
- Dapr CLI reference (docs.dapr.io/reference/cli/dapr-run/)
- AWS Step Functions Amazon States Language specification
- Dapr .NET SDK issue #1205 (removal of deprecated workflow APIs from DaprClient)

## Issues Found
1. **`[DaprWorkflow]` attribute does not exist.** The blog post decorated the workflow class with `[DaprWorkflow]`, but no such attribute exists in the Dapr .NET SDK. Workflows are registered programmatically via `services.AddDaprWorkflow(options => { options.RegisterWorkflow<OrderWorkflow>(); })`. Removed the attribute from the code example.

2. **`daprClient.StartWorkflowAsync` is deprecated/removed.** The concept mapping table referenced `daprClient.StartWorkflowAsync` as the Dapr equivalent of the Step Functions `StartExecution` API. This method was deprecated and removed from `DaprClient`. The current API is `DaprWorkflowClient.ScheduleNewWorkflowAsync`. Updated the table accordingly.

## Review Notes
- The `dapr run` command specifies `--dapr-http-port 3500`, which is the default value and therefore redundant, but not incorrect.
- The AWS Step Functions ASL example is syntactically valid and correctly demonstrates Task states, Catch blocks, and Fail states.
- The Dapr Workflow code correctly demonstrates `CallActivityAsync`, `CreateTimer`, `WaitForExternalEventAsync`, and `Task.WhenAll` patterns — all verified against official SDK examples.
- The concept mapping table is accurate after the fix to the StartExecution row.
