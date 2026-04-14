# Validation Summary: How to Restore Dapr Services After an Outage

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) v1.13.0
- Kubernetes (kubectl)
- Helm
- AWS S3 (for backup restoration)
- Bash scripting

## Sources Consulted
- Dapr Helm chart source code: https://github.com/dapr/dapr/tree/master/charts/dapr — verified placement server resource type (StatefulSet in all modes)
- Dapr State Management API docs: https://docs.dapr.io/reference/api/state_api/ — verified `/v1.0/state/{storename}` endpoint for read/write operations
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml — verified `global.ha.enabled` flag
- kubectl rollout status documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl-rollout/kubectl-rollout-status/ — verified support for StatefulSets

## Issues Found

1. **`dapr-placement-server` resource type was wrong (Step 1, line 48)**
   - **What was wrong:** The script used `kubectl rollout status deployment/dapr-placement-server` but `dapr-placement-server` is always deployed as a StatefulSet (in both HA and non-HA mode), never a Deployment.
   - **What was changed:** Changed `deployment/dapr-placement-server` to `statefulset/dapr-placement-server`.
   - **Why:** The command would fail with a "not found" error since no Deployment by that name exists. The Dapr Helm chart only contains a StatefulSet template for the placement server.

2. **Health check `grep -qv .` logic was broken (Step 5, lines 166-168)**
   - **What was wrong:** The pattern `grep -v Running | grep -v NAME | grep -qv .` was intended to check that no non-Running pods exist, but `grep -qv .` matches only empty lines. When all pods are Running, the pipe is empty and grep returns 1 (failure). When non-Running pods exist, their output lines all match `.` so `grep -v .` excludes them and also returns 1. The check always fails regardless of actual pod state.
   - **What was changed:** Replaced with `test -z "$(kubectl get pods --no-headers | grep -v Running)"` which correctly returns success (0) when no non-Running pods exist and failure (1) when any exist.
   - **Why:** The original logic was inverted/broken and would always report FAIL, making the health check script useless.

3. **Summary said "four-step" but the post has five steps (line 178)**
   - **What was wrong:** The summary paragraph said "four-step sequence" but the post contains Steps 1 through 5.
   - **What was changed:** Changed "four-step" to "five-step".
   - **Why:** Consistency between the post structure and the summary description.

## Review Notes
- The Dapr version pinned in the Helm install (1.13.0) was the latest stable release at the time of writing. Users should update to the current version for their environment.
- The Dapr Helm chart URL `https://dapr.github.io/helm-charts/` is correct.
- The state store API endpoints (`/v1.0/state/{storename}`) and JSON payload format are correct per the Dapr State Management API specification.
- The `aws s3 ls` + `awk '{print $2}'` pattern assumes S3 backup entries are listed as common prefixes (directories), which is consistent with how the variable is used downstream. This is a reasonable assumption for organized backup buckets.
- The `eval` usage in the health check function is acceptable for a recovery script where inputs are hardcoded, but in production tooling should be replaced with safer alternatives.
