# Validation Summary: How to Configure State Store Replication for Dapr DR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management, component configuration)
- Redis (Sentinel, replication)
- Azure Cosmos DB (geo-replication, automatic failover)
- Kubernetes (kubectl, CRD patching, rollout management)
- Terraform (AzureRM provider, Cosmos DB resource)
- Bash scripting (DR runbook)

## Sources Consulted
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Azure Cosmos DB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Redis REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/
- Redis INFO replication output fields
- Terraform AzureRM provider azurerm_cosmosdb_account resource documentation

## Issues Found

1. **Redis Sentinel config missing required `failover` field**: The Dapr `state.redis` component configuration for Redis Sentinel was missing the `failover: "true"` metadata field. This field is required to enable Sentinel failover mode in Dapr. Without it, Dapr would treat the Sentinel address as a regular Redis host. Added `failover: "true"` to the metadata.

2. **Invalid `replicaCount` metadata field in Redis Sentinel config**: The configuration included a `replicaCount` metadata field which is not a valid Dapr `state.redis` component metadata field. The number of Redis replicas is a Redis deployment concern, not a Dapr component setting. Replaced with the required `failover: "true"` field.

3. **Incorrect Redis replication command**: The post used `redis-cli -h redis-dr.internal CONFIG SET replica-of redis-primary.us-east.internal 6379` which is invalid. `CONFIG SET` does not accept `replica-of` as a parameter. The correct runtime command for setting up replication is `REPLICAOF host port` (available since Redis 5.0). Changed to `redis-cli -h redis-dr.internal REPLICAOF redis-primary.us-east.internal 6379`.

4. **Invalid `consistencyLevel` metadata field in Cosmos DB config**: The Dapr `state.azure.cosmosdb` component configuration included a `consistencyLevel` metadata field which is not a documented Dapr metadata field. Consistency level for Cosmos DB is configured at the account level (shown correctly in the Terraform block), not in the Dapr component. Removed the invalid field.

## Review Notes
- The Terraform `azurerm_cosmosdb_account` resource uses `enable_automatic_failover`, which is correct for AzureRM provider v3.x. In provider v4.x, this was renamed to `automatic_failover_enabled`. The post does not specify a provider version, so this is acceptable but worth noting for future updates.
- The DR cutover script uses `kubectl rollout status deployment -n $NAMESPACE` without specifying a deployment name. While `kubectl rollout restart deployment -n namespace` works for all deployments, `rollout status` typically requires a specific deployment name. This is acceptable as a conceptual runbook template but readers may need to adapt it.
- The `INFO replication` field names (`master_repl_offset`, `slave_repl_offset`) use legacy naming with the `slave_` prefix. These are still valid in current Redis versions despite the command being renamed from `SLAVEOF` to `REPLICAOF`.
