# Validation Summary: How to Implement Human Approval Workflow with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (building block)
- Dapr .NET SDK (`Dapr.Workflow` package) — `Workflow<TInput, TOutput>`, `WorkflowActivity<TInput, TOutput>`, `WorkflowContext`
- Dapr JavaScript SDK (`@dapr/dapr` package) — `DaprClient` workflow management API
- Kubernetes annotations for Dapr sidecar injection
- Durable Task Framework (underlying engine for Dapr Workflow)

## Sources Consulted
- Dapr Workflow Overview — https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Workflow Patterns (External System Interaction) — https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- How to Author a Workflow — https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- How to Manage Workflows — https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Workflow API Reference — https://docs.dapr.io/reference/api/workflow_api/
- Dapr JavaScript SDK Workflow Guide — https://docs.dapr.io/developing-applications/sdks/js/js-workflow/
- Dapr Kubernetes Annotations Reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr .NET SDK source (GitHub) — https://github.com/dapr/dotnet-sdk
- Dapr JS SDK source (GitHub) — https://github.com/dapr/js-sdk

## Issues Found

### Issue 1: `WaitForExternalEventAsync` timeout behavior (Critical)
**What was wrong:** The blog post checked `if (approval == null)` after calling `WaitForExternalEventAsync` with a `TimeSpan` timeout, implying the method returns null on timeout. In reality, the method throws a `TaskCanceledException` when the timeout elapses (inherited from the underlying Durable Task Framework behavior).

**What was changed:** Replaced the null-check pattern with a try-catch block that catches `TaskCanceledException` for the timeout case. The escalation logic was moved into the catch block, and the `approval` variable was declared outside the try block so it remains accessible afterward.

**Why:** Code following the original pattern would throw an unhandled exception on timeout instead of escalating as intended, breaking the core approval workflow use case.

### Issue 2: Incorrect `serializedOutput` property on workflow status response (Moderate)
**What was wrong:** The blog post accessed `status.serializedOutput` when checking workflow status via the JavaScript SDK. The Dapr workflow HTTP API does not return a `serializedOutput` field. The workflow output is returned inside the `properties` map under the key `dapr.workflow.output`.

**What was changed:** Changed `status.serializedOutput` to `status.properties['dapr.workflow.output']`.

**Why:** Using `serializedOutput` would return `undefined`, making the status endpoint useless for retrieving workflow results.

## Review Notes
- The `Workflow<TInput, TOutput>` base class, `WorkflowActivity<TInput, TOutput>` base class, `CallActivityAsync`, and `WaitForExternalEventAsync` APIs are all correctly used apart from the timeout handling.
- The Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`) are correct and standard for Dapr sidecar injection.
- The claim that Dapr Workflow uses state store and actors internally is accurate — each workflow instance maps to an actor instance, and workflow state is persisted via the actor state store using event sourcing.
- The JavaScript SDK methods `client.workflow.start()`, `client.workflow.raiseEvent()`, and `client.workflow.get()` all exist with the signatures shown.
- The `NotifyApproverActivity` uses `context.InstanceId` to build the approval URL, which is a reasonable approach assuming `WorkflowActivityContext` exposes this property.
- The summary section's claims about workflow state persistence across service restarts and configurable timeout with escalation are accurate.
