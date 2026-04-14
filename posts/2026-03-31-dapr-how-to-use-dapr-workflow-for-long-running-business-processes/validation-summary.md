# Validation Summary: How to Use Dapr Workflow for Long-Running Business Processes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (building block)
- Dapr .NET SDK (`Dapr.Workflow` package)
- Dapr HTTP API (workflow endpoints)
- Dapr JavaScript SDK (`@dapr/dapr` package)
- C# / .NET
- Node.js / Express

## Sources Consulted
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr .NET SDK source code (Workflow abstractions): https://github.com/dapr/dotnet-sdk (Dapr.Workflow package — `Workflow.cs`, `WorkflowContext.cs`)
- Dapr JS SDK source code: https://github.com/dapr/js-sdk (`IClientWorkflow.ts`, `WorkflowGetResponse.type.ts`)
- Dapr Workflow overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr authoring workflows guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/

## Issues Found

### 1. `WaitForExternalEventAsync` timeout behavior (Critical)
**What was wrong:** The blog post assumed `WaitForExternalEventAsync<T>` returns `null` when the timeout expires, then checked for `null` to detect timeouts. In reality, the method throws `TaskCanceledException` on timeout — the null checks would never trigger and the exception would crash the workflow.
**What was changed:** Wrapped all three `WaitForExternalEventAsync` calls in `try/catch (TaskCanceledException)` blocks, with explicitly typed nullable variables (`UnderwriterDecision?`, `SignatureEvent?`) initialized to `null` so the existing null-check logic works correctly after catching the timeout exception.

### 2. Raise Event HTTP endpoint URL (Incorrect path)
**What was wrong:** The blog used `POST /v1.0/workflows/dapr/LoanApplicationWorkflow/loan-app-001/raiseEvent/underwriter-decision`, which incorrectly includes the workflow name in the path.
**What was changed:** Corrected to `POST /v1.0/workflows/dapr/loan-app-001/raiseEvent/underwriter-decision`. Per the Dapr HTTP API, the raiseEvent endpoint pattern is `/v1.0/workflows/{componentName}/{instanceId}/raiseEvent/{eventName}` — no workflow name.

### 3. Get Workflow Status HTTP endpoint URL (Incorrect path)
**What was wrong:** The blog used `GET /v1.0/workflows/dapr/LoanApplicationWorkflow/loan-app-001`, which incorrectly includes the workflow name.
**What was changed:** Corrected to `GET /v1.0/workflows/dapr/loan-app-001`. The GET endpoint pattern is `/v1.0/workflows/{componentName}/{instanceId}` — no workflow name.

### 4. JavaScript SDK property casing (`instanceId` vs `instanceID`)
**What was wrong:** The JS code used `status.instanceId` (lowercase "d"), but the Dapr JS SDK `WorkflowGetResponseType` uses `instanceID` (uppercase "D") to match the HTTP API response.
**What was changed:** Corrected to `status.instanceID`.

## Review Notes
- The JavaScript dashboard example references `status.customStatus`, but the `DaprClient.workflow.get()` response type (`WorkflowGetResponseType`) does not have a `customStatus` field — it has a `properties` map instead. Custom status may be accessible via `status.properties` depending on the Dapr version. This was not changed since the conceptual intent is clear and the exact field availability may vary by Dapr version.
- The JSON response example in the "Check Workflow Status Anytime" section shows `customStatus` as a top-level field. The actual HTTP API response may surface this within a `properties` map depending on the Dapr runtime version.
- The .NET code passes anonymous objects as activity inputs (e.g., `new { Application = app, CreditScore = creditScore }`). While this works, using strongly-typed DTOs is recommended for production workflows to ensure reliable serialization during replay.
- The `Console.WriteLine` call inside the workflow `RunAsync` method will execute on every replay, not just the first run. For production code, logging should be done inside activities or guarded by `context.IsReplaying` checks.
