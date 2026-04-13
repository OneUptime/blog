# Validation Summary: How to Start a Dapr Workflow Programmatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow SDK (Python `dapr-ext-workflow`)
- Dapr HTTP API for workflows
- Flask (Python web framework)
- Dapr gRPC App extension (`dapr.ext.grpc`)
- Pydantic (data validation)
- Python standard library (`hashlib`)

## Sources Consulted
- Dapr Python SDK source code (`dapr/python-sdk` on GitHub) — `DaprWorkflowClient`, `WorkflowState`, `WorkflowStatus` class definitions
- Dapr official documentation — Workflow HTTP API reference (https://docs.dapr.io/reference/api/workflow_api/)
- Dapr official documentation — Workflow SDK usage (https://docs.dapr.io/developing-applications/building-blocks/workflow/)
- Pydantic v2 migration guide (https://docs.pydantic.dev/latest/migration/)
- Dapr Python SDK — `dapr.ext.grpc.App` subscribe decorator

## Issues Found

1. **`runtime_status` compared against strings instead of enum values**: In the "Idempotent Workflow Starts" section, `state.runtime_status` was compared against string literals `"RUNNING"` and `"PENDING"`. The `runtime_status` property returns a `WorkflowStatus` enum, so the comparison should use `WorkflowStatus.RUNNING` and `WorkflowStatus.PENDING`. Added the import `from dapr.ext.workflow import WorkflowStatus` and updated the comparison.

2. **Deprecated Pydantic v1 `@validator` decorator**: The "Passing Validated Input" section used `@validator` from Pydantic v1, which is deprecated in Pydantic v2 and scheduled for removal in v3. Replaced with `@field_validator` and added the required `@classmethod` decorator per Pydantic v2 API.

3. **Deprecated `.dict()` method**: `order.dict()` was replaced with `order.model_dump()`, the Pydantic v2 equivalent. The `.dict()` method is deprecated and will be removed in Pydantic v3.

## Review Notes
- The Dapr HTTP workflow API (`/v1.0/workflows/...`) shown in the post is technically correct but is marked as deprecated in official Dapr documentation. The SDK-based `DaprWorkflowClient` is the recommended approach. The post already presents the SDK as the primary method and the HTTP API as an alternative, so this is acceptable as-is.
- The `DaprWorkflowClient`, `schedule_new_workflow()`, and `get_workflow_state()` methods are all verified correct against the current Dapr Python SDK source.
- The `dapr.ext.grpc.App` subscribe decorator with `pubsub_name` and `topic` parameters is correct.
- The idempotency pattern using deterministic instance IDs is a valid and recommended approach per Dapr documentation.
