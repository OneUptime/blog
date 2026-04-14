# Validation Summary: How to Implement Workflow History Cleanup in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow API (HTTP)
- Go (net/http, encoding/json)
- Kubernetes CronJobs
- Redis (state store monitoring)
- curl / Bash scripting

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr GitHub source code: `pkg/api/http/workflow.go` (registered HTTP routes for workflow endpoints)
- Dapr GitHub issue #8837 (bulk purge proposal — closed as "not planned", blocked by Event Stream proposal dapr/proposals#77)
- Dapr workflow architecture documentation (state store persistence model)

## Issues Found

### 1. Wrong HTTP method for single workflow purge
- **What was wrong:** Used `curl -X DELETE` for the purge endpoint.
- **What was changed:** Changed to `curl -X POST`. All Dapr workflow mutation operations (terminate, pause, resume, purge) use the POST method. No workflow API endpoint uses DELETE.

### 2. Incorrect workflow status check URL
- **What was wrong:** Used `/v1.0/workflows/dapr/{instanceId}/status` to check workflow state.
- **What was changed:** Changed to `/v1.0/workflows/dapr/{instanceId}` (no `/status` suffix). The GET request to the instance ID path directly returns workflow state including `instanceID`, `workflowName`, `runtimeStatus`, `createdAt`, `lastUpdatedAt`, and `properties`.

### 3. Non-existent bulk purge API endpoint
- **What was wrong:** The "Bulk Purge by Status and Date" section used `POST /v1.0/workflows/dapr/purge` with a JSON body containing `createdTimeTo` and `status` fields. This endpoint does not exist in Dapr. GitHub issue #8837 proposed bulk purge operations but was closed as "not planned" on January 5, 2026.
- **What was changed:** Replaced the section with "Purging Multiple Workflow Instances" showing how to iterate over known instance IDs and call the single-instance purge endpoint for each, which is the correct approach.

### 4. Go service used non-existent bulk purge endpoint
- **What was wrong:** The Go `purgeOldWorkflows` function called the non-existent bulk purge endpoint with `PurgeRequest{CreatedTimeTo, Status}`.
- **What was changed:** Rewrote the Go service to: (1) check each workflow's status via the correct GET endpoint, (2) compare runtime status and creation time against criteria, (3) purge matching instances individually via `POST /v1.0/workflows/dapr/{instanceId}/purge`.

### 5. CronJob used non-existent API and broken date command
- **What was wrong:** The CronJob called the non-existent bulk purge endpoint. Additionally, it used `date -d '30 days ago'` (GNU coreutils syntax) inside a `curlimages/curl` container, which is Alpine-based and uses BusyBox date — this command would fail at runtime.
- **What was changed:** Replaced the CronJob to run the Go cleanup service as a container image with Dapr sidecar annotations (`dapr.io/enabled: "true"`, `dapr.io/app-id: "workflow-cleanup"`), which is the correct approach for a Dapr-aware Kubernetes job.

### 6. Summary paragraph referenced non-existent bulk API
- **What was wrong:** Stated "Use the `/purge` API endpoint to bulk-delete completed, failed, and terminated workflows by date range."
- **What was changed:** Updated to reference the correct per-instance purge endpoint: `POST /v1.0/workflows/dapr/{instanceId}/purge`.

## Review Notes
- Dapr's complete workflow HTTP API consists of 7 endpoints: start, get state, terminate, raise event, pause, resume, and purge — all operating on individual instances. There is no list/query or bulk operation endpoint.
- The valid terminal statuses for purge (`COMPLETED`, `FAILED`, `TERMINATED`) referenced in the post are correct.
- The claim that workflow history persists indefinitely and must be explicitly purged is accurate — Dapr documentation explicitly states "Workflow actor state remains in the state store even after a workflow has completed."
- The Redis monitoring commands in the "Monitoring State Store Size" section are correct and unchanged.
- Applications using this cleanup pattern should maintain their own tracking of workflow instance IDs, since Dapr does not provide a list/query API for workflows.
