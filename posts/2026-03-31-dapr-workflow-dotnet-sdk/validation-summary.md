# Validation Summary: How to Use Dapr Workflow with .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- .NET / C#
- Dapr .NET SDK (`Dapr.Workflow` NuGet package)
- Durable Task Framework (underlying engine)
- ASP.NET Core Web API

## Sources Consulted
- Dapr official docs — How to: Author a workflow (https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/)
- Dapr official docs — How to: Manage workflows (https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/)
- Dapr official docs — Workflow patterns (https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/)
- Dapr official docs — DaprWorkflowClient usage (https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/dotnet-workflowclient-usage/)
- NuGet Gallery — Dapr.Workflow package (https://www.nuget.org/packages/Dapr.Workflow/)
- Dapr .NET SDK GitHub — DaprWorkflowClient.cs source (https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow/DaprWorkflowClient.cs)
- Dapr .NET SDK GitHub — Workflow example app (https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Program.cs)

## Issues Found
No technical issues found.

## Review Notes
- The `GetWorkflowStateAsync` method returns a nullable `WorkflowState?`. The blog omits null checking on the returned state, which is acceptable for tutorial brevity but would need handling in production code.
- `ScheduleNewWorkflowAsync` has additional overloads accepting `startTime` and `CancellationToken` parameters not shown in the post. This is fine — the post demonstrates the core usage pattern.
- The `WorkflowRetryPolicy` constructor accepts additional optional parameters (`backoffCoefficient`, `maxRetryInterval`, `retryTimeout`) beyond the two shown. The blog correctly demonstrates the minimal required configuration using named parameters.
- The description mentions "child workflows" but the post does not demonstrate `context.CallChildWorkflowAsync`. This is a minor gap in the description vs. content, not a technical error.
