# Validation Summary: How to Query Dapr Workflow Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow building block
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr HTTP Workflow API (`v1.0/workflows`)
- Dapr CLI (`dapr workflow` subcommands)
- Python (Flask for the REST endpoint example)

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow management how-to: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Python SDK workflow documentation: https://docs.dapr.io/developing-applications/sdks/python/python-workflow/
- Dapr Workflow proto definition (`workflow.proto`) for `GetWorkflowResponse` schema
- Dapr Python SDK source (`DaprWorkflowClient`, `WorkflowState`, `WorkflowStatus`)

## Issues Found
1. **HTTP API response included SDK-only fields** (lines 56–65): The example JSON response for the HTTP API included `serializedInput` and `serializedOutput` fields. These fields do NOT exist in the HTTP API response — they are only available through the SDK (gRPC layer). The actual HTTP API response includes `instanceID`, `workflowName`, `runtimeStatus`, `createdAt`, `lastUpdatedAt`, and `properties`. Removed the two incorrect fields and added the `properties` field.

## Review Notes
- The runtime status table lists the six most commonly referenced statuses (RUNNING, COMPLETED, FAILED, TERMINATED, SUSPENDED, PENDING), which matches the Dapr protobuf documentation. The SDK enum also defines UNKNOWN and STALLED as edge-case statuses, but omitting them is reasonable for a practical guide.
- The `dapr workflow history` CLI command is valid but returns execution history (event sequence) rather than just the current status. There is no single `dapr workflow get` CLI command in all Dapr CLI versions, so this is the closest available option.
- The Dapr HTTP Workflow API has been noted as deprecated in recent Dapr documentation in favor of SDK usage. The post correctly emphasizes SDK-first approaches.
- The `wait_for_workflow_completion` method's `timeout_in_seconds` parameter is keyword-only in the SDK, and the blog correctly passes it as a keyword argument.
- The `datetime.timezone` import in the dashboard example is unused but harmless.
