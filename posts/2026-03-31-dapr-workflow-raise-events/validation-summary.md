# Validation Summary: How to Raise Events to a Running Dapr Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow API
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr HTTP API for workflows
- Dapr CLI (`dapr workflow` subcommands)
- Python

## Sources Consulted
- Dapr Python SDK source code (`dapr-ext-workflow` package on GitHub)
- Dapr official workflow HTTP API reference (https://docs.dapr.io/reference/api/workflow_api/)
- Dapr CLI reference for `dapr workflow` commands (https://docs.dapr.io/reference/cli/dapr-workflow/)
- Dapr Python SDK examples: `human_approval.py`, `monitor.py`, `simple.py`

## Issues Found

1. **`ctx.task_any()` does not exist — should be `when_any()`**: The blog used `yield ctx.task_any([approval_task, timeout_task])` but `task_any` is not a method on `DaprWorkflowContext`. The correct function is `when_any`, a module-level function imported from `dapr.ext.workflow`. Fixed to `yield when_any([...])` and added the import.

2. **CLI command flags were incorrect**: The blog used `--workflow-id`, `--event-name`, and `--event-data` flags which do not exist. The Dapr CLI `raise-event` subcommand takes a positional argument in the format `<instance-id>/<event-name>` and uses `--input` (not `--event-data`) for the data payload. Fixed to `dapr workflow raise-event --app-id approval-service --input '...' approval-REQ-001/approval-decision`.

3. **`runtime_status` compared as string instead of enum**: The blog compared `state.runtime_status != "RUNNING"` but `runtime_status` returns a `WorkflowStatus` enum, not a string. Fixed to compare against `WorkflowStatus.RUNNING` and use `.name` for the error message string interpolation.

4. **`data` parameter passed positionally in `raise_workflow_event`**: In the sequential events example, `data` was passed as a third positional argument, but it is keyword-only (after `*` in the method signature). Fixed to use `data={"approved": True}`.

## Review Notes
- The Dapr workflow HTTP API endpoint (`/v1.0/workflows/...`) is marked as deprecated in newer Dapr docs, to be replaced by the v1.0-alpha1 API. This may need updating in the future.
- The timer creation pattern `ctx.create_timer(ctx.current_utc_datetime + timedelta(hours=48))` is valid but could be simplified to `ctx.create_timer(timedelta(hours=48))` since `create_timer` accepts both `datetime` and `timedelta`. Left as-is since it is not incorrect.
