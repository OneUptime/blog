# Validation Summary: How to Fix Dapr Workflow Stuck in Running State

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr Workflow API (HTTP)
- Dapr Python SDK (`dapr.ext.workflow`)
- Dapr CLI (`dapr run`)
- State Store (actor-based workflow persistence)

## Sources Consulted
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Python SDK Workflow Extension: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr How-To: Manage workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Python SDK workflow examples on GitHub: https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py

## Issues Found

1. **All HTTP API endpoints had incorrect paths.** The blog used `/v1.0/workflows/dapr/<workflow-name>/<instance-id>` (three path segments after `/workflows/`), but the Dapr Workflow API does not include `<workflow-name>` in GET, terminate, purge, pause, or resume endpoints. The correct pattern is `/v1.0/workflows/dapr/<instance-id>`. Fixed all six endpoint URLs throughout the post.

2. **Purge endpoint used wrong HTTP method and path.** The blog used `DELETE /v1.0/workflows/dapr/<workflow-name>/<instance-id>`, but the correct Dapr API is `POST /v1.0/workflows/dapr/<instance-id>/purge`. Fixed both the method (DELETE to POST) and added the `/purge` suffix.

3. **Workflow status response included a non-existent field.** The blog showed `workflowName` in the JSON response, but this field is not part of the Dapr Workflow GET status response. Removed `workflowName` and added the documented `properties` field.

4. **Python SDK decorator names were wrong.** The blog used `@wf.defn(name=...)` which does not exist in the Dapr Python SDK. The correct decorator is `@wfr.workflow(name=...)` on a `WorkflowRuntime` instance. Similarly, `@wf.activity` should be `@wfr.activity`. Fixed both decorators and added the `WorkflowRuntime` instantiation.

5. **Retry policy class name was wrong.** The blog used `wf.WorkflowActivityRetryPolicy`, but the actual class in the Dapr Python SDK is `wf.RetryPolicy`. Fixed the class name. (The parameter names `max_number_of_attempts`, `first_retry_interval`, `backoff_coefficient` were correct.)

## Review Notes
- The `dapr run --log-level debug` command is correct and verified.
- The technical explanations of why workflows get stuck (unhandled exceptions, state store unavailability, worker crashes) are accurate.
- The retry policy parameter names (`max_number_of_attempts`, `first_retry_interval`, `backoff_coefficient`) are correct per the Dapr Python SDK.
- The Python code example now includes the necessary `import` statements and `WorkflowRuntime` setup for clarity.
