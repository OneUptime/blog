# Validation Summary: How to Scale Dapr Workflow Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow
- Durable Task Framework (durabletask-go)
- .NET / C# (Dapr .NET SDK)
- Python (aiohttp)
- Kubernetes (Deployments, HPA)
- PostgreSQL (Dapr state store)

## Sources Consulted
- Dapr Workflow overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow architecture: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-architecture/
- Dapr Workflow management: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr .NET SDK source (WorkflowServiceCollectionExtensions.cs): https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Workflow/WorkflowServiceCollectionExtensions.cs
- Dapr .NET SDK workflow example: https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Program.cs
- Dapr PostgreSQL v1 state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr PostgreSQL v2 state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/

## Issues Found

### 1. Non-existent `WorkflowEngineOptions` class and concurrency properties
**What was wrong:** The C# code used `builder.Services.Configure<WorkflowEngineOptions>` with properties `MaxConcurrentWorkflowInvocations` and `MaxConcurrentActivityInvocations`. The class `WorkflowEngineOptions` does not exist in the Dapr .NET SDK. The SDK uses `WorkflowRuntimeOptions` (via `AddDaprWorkflow`), which does not expose concurrency settings. Workflow concurrency is controlled at the Dapr sidecar level, not in application code.
**What was changed:** Removed the `WorkflowEngineOptions` configuration block and added a note explaining that concurrency is controlled via the `dapr.io/app-max-concurrency` Kubernetes annotation on the pod.
**Why:** The original code would not compile. Concurrency tuning for Dapr Workflow workers is a sidecar-level concern.

### 2. Non-existent `MapDaprWorkflowEndpoints()` method
**What was wrong:** The C# code called `app.MapDaprWorkflowEndpoints()`. This method does not exist in the Dapr .NET SDK. Dapr Workflows communicate with the sidecar via gRPC streaming; the application does not need to expose HTTP endpoints for workflow operations.
**What was changed:** Removed the `app.MapDaprWorkflowEndpoints()` call.
**Why:** Per the Dapr architecture docs, "applications don't need to listen on any ports to run workflows" as they use a gRPC pull model.

### 3. Missing required `selector` field in Kubernetes Deployment
**What was wrong:** The Deployment YAML was missing the required `spec.selector` field. Kubernetes requires a `selector` with `matchLabels` to identify which pods belong to the Deployment.
**What was changed:** Added `selector.matchLabels.app: workflow-worker` to match the pod template labels.
**Why:** Without the `selector` field, `kubectl apply` would reject the Deployment manifest.

### 4. Non-existent workflow instance listing API endpoints
**What was wrong:** The monitoring section used `curl` against `/v1.0/workflows/dapr/OrderProcessingWorkflow/instances` and a variant with `?runtimeStatus=Running`. These endpoints do not exist in the Dapr Workflow HTTP API. The API only supports getting the status of a single instance by ID (`GET /v1.0/workflows/<component>/<instanceId>`).
**What was changed:** Replaced with a valid single-instance status check via the HTTP API and the `dapr workflow list` CLI command for listing instances.
**Why:** The original commands would return 404 errors. The Dapr Workflow API does not have a bulk list/query HTTP endpoint.

## Review Notes
- The claim that Dapr Workflow is "built on the Durable Task Framework" is accurate. The architecture docs confirm it uses the `durabletask-go` library and is built on top of Dapr Actors.
- The workflow start API URL in the Python code (`POST /v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID=...`) matches the official API reference.
- The PostgreSQL v1 state store component configuration is correct: `tableName`, `connectionMaxIdleTime`, and `actorStateStore` are all valid metadata fields for `state.postgresql` version `v1`.
- The `AddDaprWorkflow` method and `RegisterWorkflow`/`RegisterActivity` calls are correct per the Dapr .NET SDK source code.
- The Python aiohttp code for batch workflow starting is syntactically correct and idiomatic.
- The HPA configuration is valid Kubernetes `autoscaling/v2` YAML.
- The summary's claim that PostgreSQL performs better than Redis for workflow state due to transaction semantics is reasonable, as Dapr Workflows rely on actors which require transactional state operations.
- The Dapr Workflow HTTP API is noted as deprecated in the official docs in favor of SDK-based management via `DaprWorkflowClient`. This is worth noting for future readers but was not changed since the post's approach is still functional.
