# Validation Summary: How to Purge Dapr Workflow History

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — Workflow building block
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr CLI (`dapr workflow` commands)
- Dapr HTTP API (workflow management endpoints)
- Redis (as example state store)

## Sources Consulted
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr CLI workflow reference: https://docs.dapr.io/reference/cli/dapr-workflow/
- Dapr "How to: Manage workflows" guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/

## Issues Found

1. **HTTP method for purge endpoint was incorrect.** The post used `curl -X DELETE` but the Dapr workflow purge API uses `POST`, not `DELETE`. Fixed to `curl -X POST`.

2. **CLI command syntax was incorrect.** The post used `dapr workflow purge --app-id order-service --workflow-id order-ORD-001` but the instance ID is a positional argument (not a `--workflow-id` flag) in the Dapr CLI. There is no `--workflow-id` flag. Fixed to `dapr workflow purge order-ORD-001 --app-id order-service`.

## Review Notes
- The Python code compares `state.runtime_status` against plain strings (`"COMPLETED"`, `"FAILED"`, `"TERMINATED"`). In the Dapr Python SDK, `runtime_status` returns a `WorkflowRuntimeStatus` enum. Depending on the SDK version and enum implementation, direct string comparison may or may not work. The conceptual approach is correct, but users may need to compare against enum members (e.g., `WorkflowRuntimeStatus.COMPLETED`) instead of string literals.
- The `state.last_updated_at` property used in the retention policy example is consistent with the Dapr Python SDK's `WorkflowState` object, though users should verify this attribute exists in their specific SDK version.
- The `redis-cli KEYS` command shown in the monitoring section can block Redis in production with large datasets. In production, `SCAN` is preferred over `KEYS`. This is acceptable as a quick diagnostic tip but should not be used in automated monitoring.
- The Dapr HTTP workflow management API has been noted as deprecated in recent Dapr docs in favor of gRPC; the concepts remain valid but users should check current API status.
