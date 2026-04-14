# Validation Summary: How to Scale Dapr Actors to Millions of Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Actor building block, Placement service, State management)
- .NET / C# (Dapr .NET SDK for actor configuration)
- Redis (state.redis state store component)
- Azure Cosmos DB (state.azure.cosmosdb state store component)
- Kubernetes (Helm chart deployment, StatefulSet, kubectl)
- Helm (Dapr Helm chart values)

## Sources Consulted
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Azure Cosmos DB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Actors overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr .NET SDK actors how-to: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-howto/
- Dapr actor reentrancy docs: https://docs.dapr.io/developing-applications/building-blocks/actors/actor-reentrancy/
- Dapr .NET SDK source (ActorRuntimeOptions, ActorRegistrationCollection): https://github.com/dapr/dotnet-sdk
- Dapr Helm chart source (placement subchart values and StatefulSet template): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr placement service monitoring metrics source: https://github.com/dapr/dapr/blob/master/pkg/placement/monitoring/metrics.go
- Dapr Actors HTTP API reference: https://docs.dapr.io/reference/api/actors_api/

## Issues Found

1. **Invalid Helm value `dapr_placement.replicaCount=3`**: The placement subchart does not expose a `replicaCount` value. The replica count is hardcoded in the StatefulSet template: 3 when HA is enabled, 1 otherwise. Setting `dapr_placement.replicaCount=3` is silently ignored by Helm. Removed this line from the Helm command since `dapr_placement.ha=true` already forces 3 replicas.

2. **Incorrect Prometheus metric name `dapr_placement_actor_count`**: This metric does not exist in the Dapr placement service. The actual placement metrics are `dapr_placement_runtimes_total`, `dapr_placement_actor_runtimes_total`, `dapr_placement_leader_status`, and `dapr_placement_raft_leader_status`. Changed the grep target to `dapr_placement_actor_runtimes_total`, which tracks the total number of actor-hosting runtimes.

## Review Notes
- The `dapr_placement.keepAliveTime=2s` value in the Helm command is valid but redundant, as `2s` is already the default. It was left in place since it serves a documentation purpose by making the setting explicit.
- The `keyPrefix` metadata field on the Redis state store is technically a common state store field (not Redis-specific), but it works correctly on any state store component including Redis.
- All .NET SDK actor configuration code is verified correct against the current Dapr .NET SDK source on the master branch.
- The actor invocation HTTP API endpoint pattern is correct.
- The placement service pod naming (`dapr-placement-server-0`) is correct for the StatefulSet.
