# Validation Summary: How to Debug Dapr Actor Placement Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Placement Service
- Dapr Actors
- Dapr Sidecar (daprd)
- Kubernetes
- Redis (as actor state store)
- Python / FastAPI (for actor config endpoint example)

## Sources Consulted
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr State Store Component for Redis: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Helm Chart (dapr-placement-server StatefulSet): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr daprd Dockerfile (distroless base image): https://github.com/dapr/dapr/blob/master/docker/Dockerfile
- Dapr placement service source code: https://github.com/dapr/dapr/tree/master/pkg/placement

## Issues Found

### 1. Incorrect label selector for placement service logs (line 27)
- **What was wrong:** The command used `-l app=dapr-placement` as the label selector.
- **What was changed:** Corrected to `-l app=dapr-placement-server` to match the actual label applied by the Dapr Helm chart on the placement StatefulSet.
- **Why:** The label `app=dapr-placement` would match zero pods, returning no logs.

### 2. Placement service is a StatefulSet, not a Deployment (line 37)
- **What was wrong:** The rollout restart command used `deployment/dapr-placement-server`.
- **What was changed:** Corrected to `statefulset/dapr-placement-server`.
- **Why:** The Dapr placement service is deployed as a StatefulSet (for stable network identities in HA mode). Using `deployment/` would fail with a "not found" error.

### 3. `wget` command in daprd container will not work (line 108)
- **What was wrong:** The post suggested running `kubectl exec -it order-service-pod -c daprd -- wget -qO- http://localhost:3000/dapr/config` to test the config endpoint from the sidecar container.
- **What was changed:** Replaced with a `kubectl port-forward` + `curl` approach, with a note that the daprd container uses a distroless image.
- **Why:** The daprd container is built on `gcr.io/distroless/static:nonroot`, which contains no shell, no `wget`, and no `curl`. The exec command would fail immediately. Port-forwarding to the app port and curling locally is the correct approach.

## Review Notes
- The placement service log messages listed under "Look for messages like" (e.g., `host removed from placement table`, `Failed to receive from host`, `disseminating to connected hosts`) could not be verified as exact strings in the Dapr source code. They appear to be illustrative approximations. The blog uses "Look for messages like" which softens this, but readers may expect exact matches. Actual log messages vary by Dapr version.
- The sidecar registration success/failure log examples (`actors: host added`, `error connecting to placement service`) are similarly illustrative. They convey the right intent but may not match exact log output in all Dapr versions.
- The `/dapr/config` response example omits the `reentrancy` and `entitiesConfig` fields that are also available in the Dapr actors API. This is fine for a focused debugging guide but worth noting for completeness.
- The actor invocation HTTP API URL pattern (`/v1.0/actors/{actorType}/{actorId}/method/{methodName}`) is confirmed correct per the official Actors API reference.
- The `actorStateStore: "true"` metadata configuration for the Redis state store component is confirmed correct per official docs.
