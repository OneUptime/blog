# Validation Summary: How to Debug Dapr Workflow Execution Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr Workflow API (HTTP management endpoints)
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr Actor state store (Redis)
- Kubernetes (kubectl for sidecar log inspection)

## Sources Consulted
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow Overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Workflow Management How-To: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Python SDK source code (`workflow_activity_context.py`) for `WorkflowActivityContext` properties
- Dapr protobuf definitions (`workflow.proto`) for `GetWorkflowResponse` field names and `TerminateWorkflowRequest` schema
- Dapr Go runtime source code for HTTP handler route registration

## Issues Found

### 1. All workflow API URLs used incorrect path structure (GET, pause, resume, terminate, purge)
- **What was wrong:** All five workflow HTTP API URLs included a `/{workflowName}/instances/` segment (e.g., `/v1.0/workflows/dapr/order-workflow/instances/wf-instance-123`). The actual Dapr API pattern is `/v1.0/workflows/{workflowComponent}/{instanceID}` with no workflow name or `/instances/` segment.
- **What was changed:** Corrected all URLs to use `/v1.0/workflows/dapr/wf-instance-123[/action]`.
- **Why:** The workflow name is not part of the URL path; Dapr resolves the workflow by instance ID alone within the specified component.

### 2. Terminate endpoint had a non-existent request body
- **What was wrong:** The terminate command included `-d '{"recursive": true}'`, but the Dapr terminate endpoint does not accept a request body. The `TerminateWorkflowRequest` protobuf message contains only `instance_id` and `workflow_component` — there is no `recursive` field.
- **What was changed:** Removed the `-d '{"recursive": true}'` from the curl command.
- **Why:** Sending an unsupported body would be silently ignored but is misleading to readers.

### 3. Purge endpoint used wrong HTTP method
- **What was wrong:** The purge command used `curl -X DELETE`. The Dapr purge workflow endpoint uses HTTP POST, not DELETE.
- **What was changed:** Changed from `DELETE` to `POST`.
- **Why:** Using DELETE would result in a 405 Method Not Allowed error.

### 4. Redis key format was oversimplified
- **What was wrong:** The Redis inspection commands used `order-service||wf-instance-123*` as the key pattern. Dapr's internal workflow actors use a more complex key structure (e.g., `dapr.internal.{namespace}.{appID}.workflow||{instanceID}`) that doesn't match the simple `{appID}||{instanceID}` pattern shown.
- **What was changed:** Replaced the specific key pattern with a broader wildcard search `*order-service*wf-instance-123*` and removed the misleading GET command.
- **Why:** The exact key format is an internal implementation detail that varies; a broader pattern match is more reliable for debugging.

## Review Notes
- The `runtimeStatus` values listed (`RUNNING`, `COMPLETED`, `FAILED`, `TERMINATED`, `SUSPENDED`) are correct but incomplete. The Dapr API also supports `PENDING`, `CANCELED`, and `CONTINUED_AS_NEW`. The blog says "Common" values, so omitting less-common ones is acceptable.
- The `properties` map keys (`dapr.workflow.input`, `dapr.workflow.custom_status`) shown in the response example are implementation details of the Dapr workflow engine, not formally documented in the API reference. They are reasonable illustrative values but readers should be aware these may change.
- The Python SDK code is correct: `WorkflowActivityContext` does expose `workflow_id` (str) and `task_id` (int) properties, and the `@wfr.activity(name=...)` decorator syntax is valid.
- The `DaprWorkflowContext` import is included but not used in the code example; this is fine as it would be needed for the workflow orchestrator function (not shown).
