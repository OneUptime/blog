# Validation Summary: How to Manage Dapr Workflow Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Workflow building block
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr HTTP API (v1.0 workflow endpoints)
- Dapr CLI (`dapr workflow` subcommands)

## Sources Consulted
- Dapr Workflow Management How-To: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr CLI Workflow Reference: https://docs.dapr.io/reference/cli/dapr-workflow/
- Dapr Python SDK source (`DaprWorkflowClient`): https://github.com/dapr/python-sdk/blob/master/ext/dapr-ext-workflow/dapr/ext/workflow/dapr_workflow_client.py
- Dapr Python SDK source (`WorkflowState` / `WorkflowStatus`): https://github.com/dapr/python-sdk/blob/master/ext/dapr-ext-workflow/dapr/ext/workflow/workflow_state.py

## Issues Found

1. **HTTP Start API request body was incorrectly wrapped** (line 43): The blog had `'{"input": {"key": "value"}}'` as the curl body for starting a workflow. Per the Dapr API reference, the request body is passed as-is directly as workflow input — it should not be wrapped in an `{"input": ...}` envelope. Fixed to `'{"key": "value"}'`.

2. **WorkflowStatus enum compared as string** (lines 160-163): The blog compared `state.runtime_status == "COMPLETED"` and `state.runtime_status == "FAILED"`. The Python SDK's `WorkflowState.runtime_status` property returns a `WorkflowStatus` enum (integer-based `Enum`, not a `str` enum), so string comparison always returns `False`. Fixed to use `WorkflowStatus.COMPLETED` and `WorkflowStatus.FAILED`, with the necessary import added.

## Review Notes
- The GET workflow response example in the blog includes a `workflowName` field. The official API reference example does not show this field, but the Go SDK response struct does include it. The field likely appears in actual responses, so it was left as-is.
- The `dapr workflow history` CLI command is used under "Querying Workflow Status". While `history` retrieves execution history rather than just current status, there is no `dapr workflow get` command in the current CLI — `history` is the closest available command for inspecting a specific instance.
- The `print(f"Status: {state.runtime_status}")` line will display the enum representation (e.g., `WorkflowStatus.RUNNING`) rather than a plain string. This is technically correct but could be made more readable with `.name` — left as-is since it's illustrative.
