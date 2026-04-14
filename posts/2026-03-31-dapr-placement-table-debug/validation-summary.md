# Validation Summary: How to Debug Dapr Placement Table Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Placement Service (actor placement and distributed hash tables)
- Dapr Actors (virtual actor model)
- Kubernetes (kubectl commands, pod management)
- Dapr CLI (dapr list, dapr logs)

## Sources Consulted
- Dapr Placement control plane service overview — https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Actors API reference — https://docs.dapr.io/reference/api/actors_api/
- Dapr Actor runtime configuration — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr CLI logs command reference — https://docs.dapr.io/reference/cli/dapr-logs/
- Dapr CLI overview — https://docs.dapr.io/reference/cli/cli-overview/
- Dapr Kubernetes deployment guide — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr common troubleshooting issues — https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr production guidelines on Kubernetes — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr GitHub issue #5029 (recommended labels for control plane) — https://github.com/dapr/dapr/issues/5029

## Issues Found
- **Incorrect Kubernetes label for placement service pods**: The post used `app=dapr-placement-server` as the label selector in `kubectl logs` commands. Dapr's standard control plane labeling convention uses `app=dapr-placement` (not `dapr-placement-server`). While the deployment/StatefulSet is named `dapr-placement-server`, the pod label follows the shorter convention. Changed both `kubectl logs` commands in the "Checking Placement Service Logs" section to use `-l app=dapr-placement`.

## Review Notes
- The `/dapr/config` endpoint and all field names (`entities`, `actorIdleTimeout`, `actorScanInterval`, `drainOngoingCallTimeout`, `drainRebalancedActors`) are verified correct against official Dapr documentation.
- The default placement service port 50005 is correct for Linux/macOS. On Windows, the default is 6050. The post doesn't mention this distinction, which is acceptable since it focuses on Kubernetes debugging.
- The `ERR_ACTOR_RUNTIME_NOT_FOUND` error code is a real Dapr error, confirmed in official troubleshooting docs.
- The `dapr logs` command exists and the syntax shown is appropriate for self-hosted environments as described.
- The term "distributed hash table" matches official Dapr documentation terminology for the placement service.
- The `kubectl rollout restart deployment/dapr-placement-server` command references the deployment name correctly (the deployment/StatefulSet is indeed named `dapr-placement-server` even though the pod label is `dapr-placement`).
