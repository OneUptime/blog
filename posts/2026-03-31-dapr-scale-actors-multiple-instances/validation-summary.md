# Validation Summary: How to Scale Actors Across Multiple Instances in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Actors (virtual actor model)
- Dapr Placement Service
- Kubernetes Deployments
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Redis (as actor state store)
- Prometheus metrics

## Sources Consulted
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Placement Service: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Actor Runtime Configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Kubernetes Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Redis State Store Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Grafana Actor Dashboard (dapr/dapr repository): grafana-actor-dashboard.json
- Dapr source code: pkg/placement/hashing/consistent_hash.go (confirms consistent hash ring implementation)
- Kubernetes HPA documentation (autoscaling/v2 API)

## Issues Found
1. **Incorrect metric name prefix**: The post used `dapr_actor_active_actors` as the Prometheus metric name and `grep dapr_actor_active_actors` in the monitoring command. Dapr runtime metrics use the `dapr_runtime_` prefix (confirmed by the official Grafana actor dashboard and Dapr source code). Fixed the grep command to `grep dapr_runtime_actor` and the example metric name to `dapr_runtime_actor_active_actors`.

## Review Notes
- The post describes the sidecar as "querying" the placement service on each actor call. In practice, the sidecar caches placement table updates locally and uses the cached information for routing, rather than making a synchronous network call per invocation. This is a common simplification in tutorials and is acceptable, but readers building latency-sensitive systems should understand the caching behavior.
- The `drainOngoingCallTimeout` is set to `"15s"` in the example, which is a valid custom value. The Dapr default is `60s` (per runtime config docs) and the API reference example uses `30s`. This is not an error but readers should be aware of the default.
- The `drainRebalancedActors` is set to `true`, which is actually the default value. Including it explicitly is fine for clarity.
- The official Dapr docs describe the placement service as using "distributed hash tables" while the post uses the term "hash ring." The underlying implementation (confirmed in source code) is indeed a consistent hash ring, so the post's terminology is accurate at the implementation level.
- The exact metric name `dapr_runtime_actor_active_actors` for tracking active actor counts should be verified against a running Dapr instance, as metric names can vary across Dapr versions. The `dapr_runtime_actor_` prefix is confirmed correct.
