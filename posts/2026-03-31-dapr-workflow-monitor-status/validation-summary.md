# Validation Summary: How to Monitor Dapr Workflow Execution Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow (building block)
- Dapr HTTP Management API (v1.0)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr Dashboard
- Mermaid diagrams

## Sources Consulted
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow management how-to: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Go SDK workflow package: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Python SDK workflow extension: https://github.com/dapr/python-sdk/tree/master/ext/dapr-ext-workflow
- Dapr proto definitions (`dapr/proto/runtime/v1/workflow.proto`)
- Dapr CLI reference for `dapr dashboard`

## Issues Found

1. **Suspend endpoint used wrong path**: The blog used `/v1.0/workflows/dapr/{instanceId}/suspend` but the correct Dapr API endpoint is `/v1.0/workflows/dapr/{instanceId}/pause`. Fixed the curl command.

2. **Terminate endpoint incorrectly included a request body**: The blog showed `curl -d '{"output": "Terminated by admin"}'` on the terminate endpoint, but the Dapr terminate workflow API does not accept a request body. The `TerminateWorkflowRequest` proto message only contains `instance_id` and `workflow_component`. Removed the `-H` and `-d` flags from the curl command.

3. **Purge endpoint used wrong HTTP method**: The blog used `DELETE` for the purge endpoint, but the correct HTTP method is `POST`. Fixed `curl -X DELETE` to `curl -X POST`.

4. **Incomplete runtime status table**: The blog listed 6 status values (`RUNNING`, `COMPLETED`, `FAILED`, `TERMINATED`, `SUSPENDED`, `PENDING`) but was missing `CANCELED` and `CONTINUED_AS_NEW`, which are documented in the official API reference. Added both missing statuses to the table.

## Review Notes
- The Go SDK example uses `GetWorkflowBeta1` which is the older `DaprClient`-based workflow API. The newer recommended approach uses `workflow.Client` from `github.com/dapr/go-sdk/workflow` with `FetchWorkflowMetadata()`. The shown API still functions but may be deprecated in future releases.
- The Python SDK example uses `DaprClient.get_workflow()` rather than the newer `DaprWorkflowClient.get_workflow_state()` from `dapr.ext.workflow`. The `DaprClient` method still works but the dedicated workflow client is preferred in current docs.
- The polling example accesses `resp.properties.get('dapr.workflow.custom_status', '')` which depends on the `DaprClient.get_workflow()` response having a `properties` dict. This works with the gRPC-level response but may differ if the SDK is updated to the newer workflow client API.
- The specific property keys `dapr.workflow.custom_status` and `dapr.workflow.input` shown in the HTTP response example are implementation-specific to the built-in Dapr workflow engine and are not formally documented in the API spec.
