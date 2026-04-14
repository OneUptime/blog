# Validation Summary: How to Implement Workflow Activity Retry Policies in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (durabletask-go)
- Go programming language
- Dapr HTTP API for workflow status

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (examples/workflow/main.go)
- Dapr durabletask-go source code: https://github.com/dapr/durabletask-go (workflow/activity.go, workflow/workflow.go, task/activity.go)
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/

## Issues Found

1. **Wrong import path**: The post used `github.com/dapr/go-sdk/workflow` but the workflow authoring types (`WorkflowContext`, `RetryPolicy`, `ActivityContext`, etc.) live in `github.com/dapr/durabletask-go/workflow`. Fixed the import.

2. **Wrong type name `ActivityRetryPolicy`**: The Dapr durabletask-go SDK defines the type as `workflow.RetryPolicy`, not `workflow.ActivityRetryPolicy`. Fixed all occurrences (4 total).

3. **Wrong function name `workflow.ActivityInput(...)`**: The correct function is `workflow.WithActivityInput(...)`. Fixed all occurrences (5 total).

4. **Wrong function name `workflow.WithRetryPolicy(...)`**: The correct function is `workflow.WithActivityRetryPolicy(...)`, and it takes a pointer (`*RetryPolicy`). Fixed all occurrences (5 total) and changed policy declarations to pointer types.

5. **Wrong workflow status API endpoint**: The post used `/v1.0/workflows/dapr/order-123/status` but the correct endpoint has no `/status` suffix: `/v1.0/workflows/dapr/order-123`. Fixed the URL.

6. **Non-existent `dapr.workflow.history` property**: The post claimed the workflow status response contains a `properties["dapr.workflow.history"]` field, but the status API returns `runtimeStatus`, `properties` with `dapr.workflow.input`/`dapr.workflow.output`/`dapr.workflow.custom_status` — no history field. Fixed the section description and jq query.

## Review Notes
- The "Activity with Transient Error Classification" section demonstrates a custom `TransientError` type, but Dapr's retry policy retries all errors by default unless the `Handle` callback on `RetryPolicy` is specified. The section is not technically wrong (the code compiles and runs), but readers may incorrectly assume that wrapping errors in `TransientError` causes Dapr to only retry those errors. The `Handle` field on `RetryPolicy` would be needed for error-type-based retry filtering.
- The retry interval calculation table is correct for exponential backoff with coefficient 2.0 and initial interval 2s, properly noting the MaxRetryInterval cap at attempt 5.
- The `RetryPolicy` struct also supports a `Handle func(error) bool` field for custom retry filtering, which could be a valuable addition in a future update.
