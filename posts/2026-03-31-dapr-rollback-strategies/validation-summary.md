# Validation Summary: How to Implement Rollback Strategies for Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics, Component CRDs)
- Kubernetes (kubectl rollout, deployments, pods)
- Helm 3 (history, rollback, status)
- Prometheus (PromQL, /api/v1/query endpoint)
- Python (requests, subprocess)
- Git (log, show, revert)
- GitOps (ArgoCD/Flux mentioned conceptually)

## Sources Consulted
- Kubernetes official docs for `kubectl rollout undo`, `kubectl rollout history`, `kubectl rollout status` commands
- Helm 3 official docs for `helm rollback`, `helm history`, `helm status` — confirmed REVISION argument is optional and defaults to previous release (https://helm.sh/docs/helm/helm_rollback/)
- Dapr metrics documentation — confirmed metric name `dapr_http_server_request_count` and label names `app_id`, `method`, `path`, `status` (https://docs.dapr.io/operations/observability/metrics/)
- Prometheus HTTP API docs for `/api/v1/query` endpoint and response format
- PromQL syntax reference for `rate()`, `sum()`, and regex label matchers

## Issues Found
- **Incorrect Dapr metric label name in PromQL query**: The Python script used `status_code=~"5.."` as the label matcher, but Dapr's HTTP server metrics use the label `status` (not `status_code`) for the HTTP response status code. Fixed both occurrences in the PromQL query to use `status=~"5.."`.

## Review Notes
- The `helm rollback order-service -n production` command (without a revision number) is correct — Helm 3 treats an omitted revision as "roll back to the previous release."
- The Python script uses `exit()` rather than `sys.exit()`. This works fine in a standalone script but `sys.exit()` is generally preferred in production code. Left as-is since it is not incorrect.
- The Dapr metric name `dapr_http_server_request_count` and available labels may change across Dapr versions. Readers should verify against their specific Dapr version's metrics endpoint.
- The `kubectl get components` command on line 130 relies on the Dapr CRD short name; this works when Dapr is installed but could confuse readers unfamiliar with CRD short names.
