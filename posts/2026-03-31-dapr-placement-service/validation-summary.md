# Validation Summary: How to Understand the Dapr Placement Service

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Placement Service (control plane component)
- Dapr Actors (virtual actor model)
- Consistent hashing / hash rings
- Raft consensus protocol
- Kubernetes (deployment and monitoring)
- Helm (chart-based deployment)
- gRPC (sidecar communication)
- Docker (self-hosted mode)

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr self-hosted mode without Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr Helm chart values (dapr_placement): https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md

## Issues Found

### 1. Incorrect actor registration flow direction and endpoint
- **What was wrong:** The sequence diagram showed `App->>Sidecar: GET /v1.0/actors/healthy (register)`, implying the app calls the sidecar at a non-existent endpoint to register actor types.
- **What was changed:** Corrected to `Sidecar->>App: GET /dapr/config (discover actor types)` — the Dapr sidecar calls the app's `/dapr/config` callback endpoint to discover which actor types the app hosts. The direction was reversed and the endpoint corrected.
- **Why:** Per the Dapr Actors API reference, the sidecar initiates actor type discovery by calling the app, not the other way around. The endpoint `/v1.0/actors/healthy` does not exist in the Dapr API.

### 2. Incorrect Helm chart value path for storage class
- **What was wrong:** The helm upgrade command used `--set dapr_placement.cluster.storageClassName=fast-ssd`.
- **What was changed:** Corrected to `--set dapr_placement.volumeclaims.storageClassName=fast-ssd`.
- **Why:** Per the Dapr Helm chart values.yaml, the storage class for placement volume claims is under `dapr_placement.volumeclaims.storageClassName`, not `dapr_placement.cluster.storageClassName`. The `cluster` section contains settings like `forceInMemoryLog` and `logStorePath`.

## Review Notes
- The post references Dapr 1.14.0 in the docker output example. The technical content is accurate for that version.
- The metadata API query `jq '.actors'` uses the top-level `actors` field in the HTTP API response, which is correct per current documentation. Note that the gRPC metadata API uses a different structure (`actorRuntime.activeActors`).
- The placement binary flag `-port` (single dash) is correct — the Dapr placement binary uses Go-style single-dash flags, consistent with official documentation examples.
- The Raft quorum explanation (odd number of nodes, tolerating one failure with 3 replicas) is accurate.
- Port 50005 is confirmed as the correct default Placement service port.
- The comparison table between Placement Service and Name Resolution is accurate.
