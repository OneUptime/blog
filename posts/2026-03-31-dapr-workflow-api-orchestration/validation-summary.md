# Validation Summary: How to Use Dapr Workflow for Multi-Step API Orchestration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Go SDK)
- Dapr Service Invocation
- Dapr Resiliency policies
- Go programming language
- Dapr HTTP API for workflow management

## Sources Consulted
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Go SDK workflow package: https://github.com/dapr/go-sdk/tree/main/workflow
- Dapr Resiliency spec documentation: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Go SDK client.InvokeMethod signature: https://pkg.go.dev/github.com/dapr/go-sdk/client

## Issues Found

1. **Workflow start endpoint missing `/start` suffix** (line 126): The post used `POST http://localhost:3500/v1.0/workflows/dapr/ProductEnrichmentWorkflow` but the correct Dapr Workflow HTTP API requires a `/start` suffix: `POST http://localhost:3500/v1.0/workflows/dapr/ProductEnrichmentWorkflow/start`. Fixed.

2. **Workflow status endpoint incorrectly included workflow name** (line 134): The post used `GET http://localhost:3500/v1.0/workflows/dapr/ProductEnrichmentWorkflow/{instance_id}` but the Dapr status endpoint does not include the workflow name in the path. The correct format is `GET http://localhost:3500/v1.0/workflows/dapr/{instance_id}`. Fixed.

3. **Resiliency spec used invalid `outbound` nesting under `targets.apps`** (lines 114-120): The `outbound` sub-field is only valid under `targets.components`, not `targets.apps`. For app targets, retry policies are applied directly (e.g., `pricing-service: retry: externalApiRetry`). Fixed.

## Review Notes
- The import path `github.com/dapr/go-sdk/workflow` was removed from the Go SDK starting in v1.14.0. The current recommended import is `github.com/dapr/durabletask-go/workflow`. The code examples are internally consistent with the older SDK API (v1.13.0 and earlier), but readers using newer SDK versions will need to adjust imports and some API calls (e.g., `workflow.ActivityInput()` becomes `workflow.WithActivityInput()`).
- The Dapr Workflow HTTP API (`v1.0/workflows/...`) is marked as deprecated in favor of SDK-based workflow management. The endpoints still work but readers should be aware the SDK approach is preferred.
- The exponential retry policy configuration omits the `duration` field (initial backoff interval), which is technically required. It will use the Dapr default, but explicitly setting it would be more complete.
