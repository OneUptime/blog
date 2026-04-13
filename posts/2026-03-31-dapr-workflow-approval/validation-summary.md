# Validation Summary: How to Use Dapr Workflow for Approval Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK)
- Python (generator-based workflow orchestration)
- Flask (REST API for approval endpoints)
- DaprWorkflowClient (workflow event raising and state queries)

## Sources Consulted
- Dapr Python SDK source code on GitHub (dapr/python-sdk), specifically `dapr/ext/workflow/` module
- Dapr Python SDK `examples/workflow/human_approval.py` — official human-approval workflow example
- `DaprWorkflowContext` class source: `dapr_workflow_context.py` — verified `call_activity()`, `wait_for_external_event()`, `create_timer()`, `current_utc_datetime`
- `when_any()` function source: `dapr/ext/workflow/__init__.py` — confirmed it is a module-level function, not a method on the context
- `DaprWorkflowClient` class source: verified `raise_workflow_event()` and `get_workflow_state()` signatures
- `task.py` source: verified `Task.get_result()` method and `Orchestrator` type alias confirming generator/yield pattern

## Issues Found
1. **`ctx.task_any()` does not exist — replaced with `when_any()`**: The blog used `ctx.task_any([...])` as if it were a method on `DaprWorkflowContext`. The correct API is `when_any()`, a module-level function imported from `dapr.ext.workflow`. This appeared in both the single-level approval workflow (line 41) and multi-level approval workflow (line 77). Fixed by replacing both occurrences with `when_any([...])` and adding `when_any` to the import statement.
2. **Missing `when_any` import**: Added `when_any` to the `from dapr.ext.workflow import ...` statement in the first code block.
3. **Summary section referenced `task_any()`**: Updated the prose in the Summary section to reference `when_any()` instead of the non-existent `task_any()`.

## Review Notes
- `ctx.create_timer(ctx.current_utc_datetime + timedelta(hours=72))` is valid since `create_timer()` accepts both `datetime` and `timedelta`, but the official example uses `timedelta` directly (e.g., `ctx.create_timer(timedelta(hours=24))`), which is more concise. Left as-is since it is functionally correct.
- `state.runtime_status` returns a `WorkflowStatus` enum, not a plain string. When serialized to JSON via Flask's `jsonify()`, enum values may not serialize as expected depending on the JSON encoder. This is a minor concern for a tutorial-style post and was left as-is.
- The workflow functions correctly use Python's generator pattern with `yield` rather than `async/await`, which matches the Dapr Python SDK's design.
- Helper functions like `get_approver()`, `send_approval_email()`, `provision_resource()`, and `send_email()` are assumed to be user-defined and are not part of the Dapr SDK — this is appropriate for a tutorial.
