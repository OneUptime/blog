# Validation Summary: How to Implement Workflow External Event Handling in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (.NET SDK)
- C# / .NET
- ASP.NET Core Minimal APIs
- Dapr HTTP API (workflow management endpoints)

## Sources Consulted
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow management how-to: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr .NET SDK GitHub repository: https://github.com/dapr/dotnet-sdk
- Microsoft Learn - ASP.NET Core framework reference: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/metapackage-app
- NETSDK1080 error documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1080

## Issues Found

1. **Project template and package references**: The post used `dotnet new console` but the code uses `WebApplication.CreateBuilder`, which requires a web project. Changed to `dotnet new web`. Also removed `dotnet add package Microsoft.Extensions.Hosting` (included in the web SDK) and `dotnet add package Microsoft.AspNetCore.App` (this is a framework reference implicitly included in web projects, not a NuGet package — attempting to add it causes NETSDK1080 error).

2. **WaitForExternalEventAsync timeout behavior**: The post checked for a null return value to detect timeout. In the Dapr .NET SDK, `WaitForExternalEventAsync` throws a `TaskCanceledException` when the timeout expires. Changed to a try/catch pattern.

3. **Unused CancellationTokenSource**: A `using var cts = new CancellationTokenSource()` was declared but never used. Removed it.

4. **Dapr HTTP API endpoint format**: The curl examples used `/v1.0/workflows/dapr/ExpenseApprovalWorkflow/expense-1234/raiseEvent/ApprovalDecision`, which incorrectly includes the workflow type name in the URL path. The correct Dapr API format is `/v1.0/workflows/{workflowComponentName}/{instanceId}/raiseEvent/{eventName}` — no workflow type. Fixed to `/v1.0/workflows/dapr/expense-1234/raiseEvent/ApprovalDecision`.

5. **SerializedCustomStatus property**: Changed `state.SerializedCustomStatus` to `state.ReadCustomStatusAs<string>()`, which is the documented API for reading custom status from workflow state.

## Review Notes
- The `Task.WhenAny` pattern for competing external events is a known area with bugs in the Dapr .NET SDK (see dapr/dotnet-sdk#1129). While the pattern shown is conceptually correct for Durable Task Framework, users may encounter issues in practice. This is a known SDK limitation, not a blog error.
- The `CallActivityAsync` calls use string-based activity names (e.g., `"ValidateExpense"`) rather than `nameof(ValidateExpenseActivity)`. Both approaches work, but `nameof()` is more refactoring-safe. This is a style choice, not an error.
- The activities for `ProcessPayment` and `NotifyEmployee` use `object` as the input type with anonymous objects. This works for serialization but loses type safety. A dedicated record type would be more robust in production.
