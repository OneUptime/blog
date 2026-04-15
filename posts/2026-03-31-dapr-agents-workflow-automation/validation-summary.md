# Validation Summary: How to Use Dapr Agents for Workflow Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (workflow building block, pub/sub, HTTP API, CLI, dashboard)
- Python (Dapr workflow SDK — `dapr-ext-workflow`)
- Flask (web framework for pub/sub subscriber endpoint)
- Kubernetes (deployment target)

## Sources Consulted
- Dapr Workflow API reference — https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow overview — https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr How-to: Manage workflows — https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Python Workflow SDK — https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr CLI `dapr init` reference — https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI `dapr dashboard` reference — https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr Python SDK workflow examples (GitHub) — https://github.com/dapr/python-sdk/tree/main/examples/workflow

## Issues Found

1. **Workflow component YAML was unnecessary.** The post included a `workflow.dapr` Component YAML definition and a `kubectl apply` step. The Dapr workflow engine is built-in to the sidecar and requires no separate component file. Removed the YAML block and the `kubectl apply` command, and updated the description to clarify this.

2. **GET workflow status endpoint had an incorrect path.** The post used `GET /v1.0/workflows/dapr/agent_workflow/{instance_id}` (3 path segments after `workflows/`). The correct Dapr API path is `GET /v1.0/workflows/<componentName>/<instanceId>` — it does not include the workflow name. Fixed to `/v1.0/workflows/dapr/{instance_id}`.

3. **Request body had a misleading `"input"` wrapper.** The `curl` example sent `{"input": {"task_id": "task-123", "risk_score": 30}}`. The Dapr workflow HTTP API passes the request body as-is to the workflow function. Since the workflow code receives this as `input_data: dict` and accesses `input_data.get("risk_score")`, the body should be sent directly as `{"task_id": "task-123", "risk_score": 30}` without the wrapper.

4. **Used deprecated `DaprClient.start_workflow()` API.** The pub/sub example used `DaprClient().start_workflow()`, which is deprecated. Replaced with the current `DaprWorkflowClient().schedule_new_workflow()` from `dapr.ext.workflow`.

5. **Missing Flask imports.** The pub/sub example used `Flask`, `request`, and `jsonify` without importing them. Added the missing `from flask import Flask, request, jsonify` import.

## Review Notes
- The Dapr Workflow HTTP API itself is marked as deprecated in the official docs, with the recommendation to use SDK-based clients instead. The HTTP API examples in the "Triggering the Workflow" section still work but readers should be aware the SDK approach is preferred.
- The term "Dapr Agents" as used in this post refers to a general pattern of combining AI decision-making with Dapr workflows, not a specific Dapr product or API called "Agents."
- The Python workflow code uses `yield ctx.call_activity()` which is correct for the Dapr Python workflow SDK's generator-based workflow model.
