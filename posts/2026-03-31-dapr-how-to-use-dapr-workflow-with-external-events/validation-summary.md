# Validation Summary: How to Use Dapr Workflow with External Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- Dapr Workflow .NET SDK (`Dapr.Workflow`)
- Dapr Client .NET SDK (`Dapr.Client`)
- Dapr HTTP API (Workflow endpoints)
- C# / .NET

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow .NET SDK documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Workflow external events documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/
- Dapr .NET SDK GitHub examples: https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow

## Issues Found

1. **Incorrect raiseEvent URL pattern**: The blog post included the `{workflowName}` segment in the raiseEvent HTTP API URL (`/v1.0/workflows/dapr/ApprovalWorkflow/order-wf-001/raiseEvent/...`). The official Dapr API does not include the workflow name in this endpoint. Fixed to `/v1.0/workflows/dapr/order-wf-001/raiseEvent/...`. This affected both the approval and rejection curl examples.

2. **Incorrect get-status URL pattern**: Same issue as above — the get workflow status URL included `{workflowName}` (`/v1.0/workflows/dapr/ApprovalWorkflow/order-wf-001`). Fixed to `/v1.0/workflows/dapr/order-wf-001`.

3. **Incorrect WaitForExternalEventAsync timeout behavior**: The blog post checked for `null` return from `WaitForExternalEventAsync` on timeout (`if (approvalEvent == null || !approvalEvent.Approved)`). In reality, `WaitForExternalEventAsync` throws a `TaskCanceledException` when the timeout expires — it does not return null. Fixed by wrapping the call in a try/catch block for `TaskCanceledException`.

4. **Incorrect workflow status response JSON**: The example response included a `workflowName` field that does not exist in the actual Dapr API response. Removed it and added the `properties` field which is part of the actual response schema.

## Review Notes
- The `Task.WhenAny` pattern in the multiple events example is correct and idiomatic for Dapr Workflow .NET SDK.
- The `DaprClient.RaiseWorkflowEventAsync` method used in the SDK example is the older but still valid API. The newer `DaprWorkflowClient.RaiseEventAsync` is also available but both work.
- The workflow start URL pattern is correct — `instanceID` is properly passed as a query parameter.
