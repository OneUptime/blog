# Validation Summary: How to Run Dapr Quickstart for Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (workflow building block)
- Dapr Python SDK (`dapr-ext-workflow`)
- Python
- Flask
- Dapr CLI
- Dapr Workflow HTTP API

## Sources Consulted
- Dapr Python SDK source code (`dapr/python-sdk` on GitHub) — `dapr/ext/workflow/workflow_runtime.py`, `dapr/ext/workflow/client.py`, `dapr/ext/workflow/workflow_state.py`
- PyPI package listing for `dapr-ext-workflow`
- Dapr official documentation — Workflow API reference (`https://docs.dapr.io/reference/api/workflow_api/`)
- Dapr Python SDK workflow examples (`dapr/python-sdk/examples/workflow/`)
- Dapr CLI reference documentation

## Issues Found

### 1. Wrong client class and methods for workflow management (Critical)
**What was wrong:** The blog used `DaprClient` (from `dapr.clients`) with methods `start_workflow()` and `get_workflow()` to start and query workflows. These methods do not exist on `DaprClient`.
**What was changed:** Replaced with `DaprWorkflowClient` (from `dapr.ext.workflow`) using the correct methods `schedule_new_workflow()` and `get_workflow_state()`. Updated the import statement, added client instantiation, and rewrote both Flask endpoint handlers to use the correct API. The `schedule_new_workflow()` method returns a string instance ID directly (not an object with `.instance_id`), and `get_workflow_state()` does not take a `workflow_component` parameter.

### 2. Wrong HTTP method for purge endpoint (Moderate)
**What was wrong:** The blog used `curl -X DELETE` for the purge endpoint at `/v1.0/workflows/dapr/{instanceId}/purge`.
**What was changed:** Changed to `curl -X POST`. The Dapr workflow HTTP API specifies POST for the purge operation, not DELETE.

### 3. Incorrect SUSPENDED status description (Minor)
**What was wrong:** The blog described `SUSPENDED` as "Workflow is waiting for an external event." This is incorrect — waiting for an external event keeps the workflow in `RUNNING` status.
**What was changed:** Updated description to "Workflow was explicitly paused via pause API" which accurately reflects the meaning of the SUSPENDED status.

### 4. Missing PENDING status value (Minor)
**What was wrong:** The workflow status table omitted the `PENDING` status, which is a common status seen when a workflow has been scheduled but hasn't started executing yet.
**What was changed:** Added `PENDING` row to the status table with description "Workflow is scheduled but not yet started."

## Review Notes
- The `WorkflowRuntime` decorator API, `DaprWorkflowContext` yield-based orchestration, `WorkflowActivityContext`, and `workflow_runtime.start()` are all correct and match the current SDK.
- The `dapr run` command syntax is correct.
- The terminate HTTP endpoint (`POST .../terminate`) is correct.
- The Mermaid diagrams are accurate representations of the workflow flow and durable execution replay behavior.
- Flask is used as the HTTP framework; the official Dapr quickstart examples typically use FastAPI, but Flask is a valid alternative.
- The status table still omits less common statuses (`UNKNOWN`, `STALLED`) for brevity, which is acceptable for a quickstart tutorial.
