# Validation Summary: How to Migrate from Azure Functions to Dapr Workflow

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Workflow (.NET SDK)
- Azure Durable Functions
- C# / .NET
- Dapr CLI (`dapr run`)

## Sources Consulted
- Dapr Workflow .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/
- Dapr "How to: Author a workflow" guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr "How to: Manage workflows" guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- DaprWorkflowClient source code: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow/DaprWorkflowClient.cs
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Diagrid blog on Dapr workflow patterns in .NET: https://www.diagrid.io/blog/in-depth-guide-to-dapr-workflow-patterns

## Issues Found

1. **Non-existent `[DaprWorkflow]` and `[DaprWorkflowActivity]` attributes**: The blog used `[DaprWorkflow]` on the workflow class and `[DaprWorkflowActivity]` on the activity class. These attributes do not exist in the Dapr .NET SDK. Workflows and activities are registered programmatically via `services.AddDaprWorkflow(options => { options.RegisterWorkflow<T>(); options.RegisterActivity<T>(); })`. Removed both attributes from the code examples.

2. **Deprecated `daprClient.StartWorkflowAsync()` API**: The blog used `_daprClient.StartWorkflowAsync(workflowComponent: "dapr", workflowName: ..., instanceId: ..., input: ...)`. This method is deprecated in favor of `DaprWorkflowClient.ScheduleNewWorkflowAsync(name, instanceId, input)`. Updated the "Starting the Workflow" code example and the concept mapping table to use `daprWorkflowClient.ScheduleNewWorkflowAsync()`.

3. **Incorrect method name `GetWorkflowAsync`**: The concept mapping table listed `daprClient.GetWorkflowAsync` as the Dapr equivalent of `DurableClient.GetStatusAsync`. The correct method is `daprWorkflowClient.GetWorkflowStateAsync()`. Updated the table.

4. **Deprecated `--components-path` CLI flag**: The `dapr run` command used `--components-path`, which is deprecated. Updated to `--resources-path`.

## Review Notes
- The post does not show the required `AddDaprWorkflow()` registration code in `Program.cs`/`Startup.cs`, which is how Dapr discovers workflows and activities. A future revision could add this to make the migration guide more complete.
- The `Workflow<TInput, TOutput>` base class, `WorkflowActivity<TInput, TOutput>` base class, `CallActivityAsync`, and `WaitForExternalEventAsync` APIs are all correct.
- The Azure Durable Functions "Before" code examples are accurate.
- The claim that Dapr Workflow uses the same durable execution model is correct — both are built on the Durable Task Framework.
