# Validation Summary: How to Handle Dapr Workflow Errors and Retries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (building block)
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr Go SDK (`github.com/dapr/go-sdk/workflow`)
- Dapr HTTP API (workflow management)

## Sources Consulted
- Dapr Workflow Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Go SDK workflow package: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api
- Dapr Workflow authoring how-to: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Python SDK examples on GitHub: https://github.com/dapr/python-sdk/tree/main/examples/workflow
- Dapr Go SDK examples on GitHub: https://github.com/dapr/go-sdk/tree/main/examples/workflow

## Issues Found

1. **Python: unused `WorkflowActivityConfig` import and variable** — The code imported `WorkflowActivityConfig` from `dapr.ext.workflow.workflow_activity_config` and created a `retry_policy` variable wrapping a `RetryPolicy` in it, but this variable was never used. The class does not appear in official Dapr Python SDK documentation. The actual activity calls correctly passed `retry_policy=wf.RetryPolicy(...)` directly to `call_activity()`. Removed the unused import and variable to avoid confusion.

2. **Go SDK: incorrect option function name** — The code used `daprwf.WithRetryPolicy()` to attach retry policies to activity calls. The correct function in the Dapr Go SDK is `daprwf.ActivityRetryPolicy()` (added in v1.12.0). Changed both usages. Also changed the `RetryPolicy` from pointer (`&daprwf.RetryPolicy{...}`) to value (`daprwf.RetryPolicy{...}`) to match the `ActivityRetryPolicy` function signature which takes a value.

3. **Terminate API: incorrect request body** — The curl command included `-H "Content-Type: application/json"` and `-d '{"output": "Manually terminated by operator"}'`. The Dapr workflow terminate endpoint (`POST /v1.0/workflows/{component}/{instanceId}/terminate`) does not accept a request body. Removed the unnecessary headers and body.

4. **Prerequisites: version too low** — Changed from "Dapr v1.10 or later" to "Dapr v1.12 or later". While v1.10 introduced workflows in alpha, retry policies on activities (especially `ActivityRetryPolicy` in Go) were added in v1.12 when workflows moved to beta.

## Review Notes
- The Python SDK `call_activity()` parameter `retry_policy` accepting a `RetryPolicy` object directly is correct and is the canonical way to attach retry policies in Python.
- The Mermaid diagrams are well-structured and accurately represent the error handling flow and saga/compensation pattern.
- The retry policy parameters table uses generic camelCase/snake_case naming. The Go SDK actually uses PascalCase struct fields (`MaxAttempts`, `InitialRetryInterval`), which is standard Go convention. The table is acceptable as a cross-SDK reference but readers should note the naming convention differences.
- Workflows became stable in Dapr v1.15. If the post targets production use, authors may want to update the prerequisite to v1.15 in the future.
