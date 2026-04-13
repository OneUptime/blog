# Validation Summary: How to Test Dapr Workflows Locally

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Dapr Workflows (workflow building block)
- Dapr CLI (`dapr init`, `dapr run`)
- Python (activity and workflow code)
- pytest (unit and integration testing)
- In-memory state store component (`state.in-memory`)

## Sources Consulted
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr self-hosted init documentation: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr in-memory state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/
- Dapr Python SDK workflow examples: https://github.com/dapr/python-sdk/tree/master/examples/workflow

## Issues Found

1. **Start workflow URL missing `/start` suffix.** The blog used `POST /v1.0/workflows/dapr/order_saga_workflow` but the correct Dapr API endpoint is `POST /v1.0/workflows/dapr/order_saga_workflow/start`. Fixed in the curl command and the Python `start_workflow()` helper function.

2. **Get workflow status URL incorrectly included the workflow name.** The blog used `GET /v1.0/workflows/dapr/order_saga_workflow/{instanceId}` but the correct Dapr API endpoint is `GET /v1.0/workflows/dapr/{instanceId}` (no workflow name in the path). Fixed in the curl command and the Python `get_workflow_status()` helper function.

3. **Non-existent `serializedOutput` response field.** The integration test asserted against `final_status["serializedOutput"]`, but the Dapr workflow GET response does not contain this field. Workflow output is returned under `properties["dapr.workflow.output"]`. Fixed the assertion accordingly.

## Review Notes
- The Dapr HTTP Workflow API is marked as deprecated in the official docs. Future versions of this post may want to switch to using the Dapr SDK directly for starting and querying workflows instead of the HTTP API.
- The activity code snippet omits `import requests` and `import os` — this is a common blog convention (showing only the relevant function) and not a technical error, but readers may benefit from seeing the full imports.
- The `patch("requests.post")` mock target works correctly because `app.activities` references the same `requests` module object, but the more precise target would be `"app.activities.requests.post"` to avoid side effects in other modules during testing.
