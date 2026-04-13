# Validation Summary: How to Configure Dapr Workflow Versioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow (Durable Task Framework)
- Go (durabletask-go SDK)
- Dapr HTTP API
- Dapr Go client SDK

## Sources Consulted
- Dapr Workflow concepts documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/
- Dapr "How to: Author a workflow" guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- durabletask-go task package (pkg.go.dev): https://pkg.go.dev/github.com/microsoft/durabletask-go/task
- Dapr Go SDK workflow package: https://pkg.go.dev/github.com/dapr/go-sdk/workflow

## Issues Found

1. **Fabricated metadata API field (`activeWorkflows`)**: The "Drain and Replace" section used `curl http://localhost:3500/v1.0/metadata | jq '.activeWorkflows'` to monitor in-flight instances. The Dapr metadata endpoint does not include an `activeWorkflows` field. Fixed to use the correct per-instance workflow status endpoint: `GET /v1.0/workflows/dapr/<instanceId>`.

2. **Fabricated HTTP API list-instances endpoints**: The "Monitoring Active Instances by Version" section used `GET /v1.0/workflows/dapr/OrderWorkflow/instances` and a `?runtimeStatus=RUNNING` query parameter. Dapr does not provide an HTTP API to list all workflow instances by workflow name. The correct API retrieves a single instance by ID: `GET /v1.0/workflows/dapr/{instanceId}`. Fixed the endpoints and added a note explaining that instance IDs must be tracked by the application.

## Review Notes
- The Go code examples use the `durabletask-go` library's API (`task.OrchestrationContext`, `AddOrchestratorN`, `AddActivityN`) rather than the higher-level Dapr Go SDK's `workflow` package. Both are valid approaches — the Dapr Go SDK's workflow authoring is built on top of durabletask-go — but readers expecting the Dapr SDK patterns may need to adjust.
- The client-side code uses `client.StartWorkflow` which may correspond to a newer stable Dapr Go SDK API (post Dapr 1.14 graduation from beta). Older SDK versions use `StartWorkflowBeta1`.
- The core versioning concepts (non-determinism during replay, version guards, ContinueAsNew migration, activity safety) are all technically accurate and align with the Durable Task Framework's documented behavior.
- The claim "activities are not replayed from history" is correct — during replay, previously completed activity results are returned from the event history without re-executing the activity code.
