# Validation Summary: How to Use the Dapr Placement API Reference

## Status
validated

## Post Type
Reference / Practical Guide

## Technologies Covered
- Dapr Placement service
- Dapr sidecar architecture
- Dapr Actors (virtual actor model)
- gRPC (health probes, grpcurl)
- Dapr CLI (status, logs, init)
- Dapr Metadata HTTP API
- Kubernetes (pod management, Helm values)
- Node.js / Express (actor config endpoint example)

## Sources Consulted
- Dapr Placement service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr actor runtime configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr CLI `dapr logs` reference: https://docs.dapr.io/reference/cli/dapr-logs/
- Dapr CLI `dapr status` reference: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr CLI `dapr init` reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr Kubernetes production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr placement.proto (GitHub): https://github.com/dapr/dapr/blob/master/dapr/proto/placement/v1/placement.proto
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md

## Issues Found

1. **Incorrect metadata API field name**: The jq query used `.activeActorsCount` but the actual field in the Dapr metadata API response is `.actors`. Changed `jq '.activeActorsCount'` to `jq '.actors'`.

2. **Wrong gRPC message/RPC name in actor registration flow**: Step 2 referenced a `RegisterActorHost` message, which does not exist in the Dapr placement proto. The actual mechanism is a bidirectional streaming RPC called `ReportDaprStatus` where the sidecar sends `Host` messages. Changed to `Sends a Host message via the ReportDaprStatus stream`.

3. **Incorrect attribution of placement table dissemination**: Step 4 of the actor registration flow stated the sidecar "Forwards placement tables to all connected sidecars." This is wrong — it is the Placement service itself that disseminates updated placement tables to all connected sidecars via the streaming connection. Fixed to correctly attribute this to the Placement service.

4. **Wrong Helm value for HA mode**: The post used `dapr_placement.replicaCount=3` which is not a valid Helm parameter. The correct way to enable HA for the Placement service is `dapr_placement.ha=true`, which automatically deploys a 3-node StatefulSet. Changed accordingly.

## Review Notes
- The post correctly notes that the Placement API is internal/not meant for direct application use, which is good guidance.
- The `/dapr/config` endpoint and all its field names are correct, though additional optional fields (`reentrancy`, `entitiesConfig`) exist that were not mentioned — this is acceptable for a practical reference.
- The default port 50005 is correct for Linux/macOS self-hosted mode; on Windows the default is 6050, which the post does not mention. This is a minor omission.
- The gRPC service name `dapr.proto.placement.v1.Placement` and `grpc.health.v1.Health` are both correct.
- All Dapr CLI commands (`dapr status`, `dapr logs`) and their flags are valid.
