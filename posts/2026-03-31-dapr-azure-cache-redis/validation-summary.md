# Validation Summary: How to Use Dapr with Azure Cache for Redis

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Cache for Redis
- Dapr Redis state store component (`state.redis`)
- Dapr Redis pub/sub component (`pubsub.redis`)
- Microsoft Entra ID (formerly Azure AD) authentication
- Kubernetes (AKS)
- Dapr Actors

## Sources Consulted
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Azure Cache for Redis VNet documentation (port 6379/6380 confirmation)
- Azure Cache for Redis Microsoft Entra ID authentication documentation

## Issues Found

### 1. Incorrect Azure RBAC role for Entra ID authentication
- **What was wrong:** The post stated to assign the `Cache Contributor` role for Entra ID authentication. `Cache Contributor` (more precisely `Redis Cache Contributor`) is a management-plane role for managing the cache resource itself, not for Redis data operations.
- **What was changed:** Changed `Cache Contributor` to `Data Owner` access policy, which is the correct Azure data access policy for Redis data operations with Entra ID. The Dapr documentation specifically references the `RedisDataOwner` role permission for `useEntraID`.
- **Why:** Using the wrong role would result in authentication failures when Dapr tries to perform Redis data operations.

### 2. Non-existent `actorStateStoreName` metadata field
- **What was wrong:** The Actor State section included a metadata field `actorStateStoreName` with value `statestore`. This field is not documented in the Dapr Redis state store component reference.
- **What was changed:** Removed the `actorStateStoreName` metadata entry. Only `actorStateStore: "true"` is needed to mark a state store for actor use.
- **Why:** Including an undocumented field could confuse readers and has no effect. The component's `metadata.name` already identifies the state store; no separate `actorStateStoreName` field is needed.

## Review Notes
- The Entra ID authentication section shows an `auth.secretStore: azurekeyvault` block. While syntactically correct for Dapr component schema, when using Entra ID with managed identity there are no secrets to retrieve from Key Vault for the Redis connection itself. The `auth` block is not strictly necessary in this context but is not harmful.
- The geo-replication section's comment that "Geo-replica is read-only" is a simplification. Azure Cache for Redis active geo-replication (Enterprise tier) supports read/write on all replicas, while passive geo-replication (Premium tier) has a read-only secondary. The post does not distinguish between these tiers.
- The `consumerID` value `{uuid}` is a placeholder template. Dapr auto-generates a UUID if not set, so this is functionally correct as documentation.
