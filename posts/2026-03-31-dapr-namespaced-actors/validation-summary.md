# Validation Summary: How to Use Namespaced Actors in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (actors, placement service, service invocation, state management)
- Kubernetes (namespaces, NetworkPolicy)
- Redis (as Dapr actor state store)
- Helm (Dapr deployment configuration)

## Sources Consulted
- Dapr Actors Overview: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Actors API Reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Service Invocation Namespaces: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-namespaces/
- Dapr Helm Chart Values (dapr_placement): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr Placement API Reference: https://docs.dapr.io/reference/api/placement_api/
- Dapr Environment Variables Reference: https://docs.dapr.io/reference/environment/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis State Store Component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found

### 1. Fabricated Helm chart configuration (`dapr_placement.namespace_scoped: true`)
**What was wrong:** The post claimed namespace-scoped placement is enabled via a `dapr_placement.namespace_scoped: true` Helm value. This configuration key does not exist in the Dapr Helm chart.
**What was changed:** Replaced the section to explain that namespace-scoped actor placement is the default behavior of Dapr's placement service — no special Helm configuration is needed. Sidecars in one namespace automatically do not receive placement info for apps in other namespaces.
**Why:** The fabricated config would cause confusion; users would find no such key in the Helm chart.

### 2. Incorrect namespace label (`dapr.io/enable-api-logging=true`)
**What was wrong:** The post presented `kubectl label namespace tenant-a dapr.io/enable-api-logging=true` as a way to enable namespace-scoped actors. This annotation is actually for enabling API logging on the Dapr sidecar and has nothing to do with namespace scoping.
**What was changed:** Removed the incorrect command entirely. Namespace-scoped actors do not require a label or annotation — they are inherent to the placement service design.
**Why:** Using this label would only enable API logging, not namespace isolation, misleading readers.

### 3. Fabricated `Dapr-Namespace` HTTP header for cross-namespace actor calls
**What was wrong:** The post used a `Dapr-Namespace: tenant-a` header in a curl command to invoke an actor across namespaces. This header does not exist in the Dapr HTTP API. Furthermore, the post's own text states actors cannot call each other across namespaces, which contradicts the example.
**What was changed:** Replaced the example with a correct cross-namespace service invocation using the `{app-id}.{namespace}` URL format (`counter-service.tenant-a`), and clarified that this invokes a service method (not an actor method directly). Added a note that the target service can then interact with its local actors.
**Why:** The `Dapr-Namespace` header doesn't exist. Cross-namespace service invocation in Dapr uses the `app-id.namespace` pattern in the URL path.

### 4. Wrong port for placement metadata endpoint
**What was wrong:** The post used `localhost:9090` for the placement state endpoint. Port 9090 is the Prometheus metrics port in Dapr, not the placement API port. The correct port is 8080.
**What was changed:** Changed the port from 9090 to 8080. Also added a prerequisite note that the metadata endpoint must be enabled via `dapr_placement.metadataEnabled: true` in Helm, as this endpoint is disabled by default.
**Why:** Using port 9090 would hit the Prometheus metrics endpoint or get a connection refused, not the placement state API.

## Review Notes
- The `NAMESPACE` environment variable for self-hosted mode, the actor invocation API path format, and the `state.redis` component YAML with `actorStateStore` metadata were all verified as correct.
- The general concept of namespaced actors in Dapr is accurate — the placement service does partition actor placement by namespace. The post's description of the concept and its utility for multi-tenant SaaS is sound.
- The best practices section recommendations are reasonable and align with Dapr documentation guidance.
- The official Dapr docs also mention using the `redisDB` metadata field for logical database isolation within a single Redis instance as an alternative to fully separate Redis instances per namespace. The blog's approach of separate instances is valid but readers should be aware of the alternative.
