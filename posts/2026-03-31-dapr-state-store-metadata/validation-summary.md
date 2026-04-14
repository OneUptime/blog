# Validation Summary: How to Configure State Store Metadata in Dapr

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management building block
- Redis state store component (`state.redis`)
- PostgreSQL v2 state store component (`state.postgresql`)
- Azure Cosmos DB state store component (`state.azure.cosmosdb`)
- HashiCorp Vault secret store (`secretstores.hashicorp.vault`)
- Kubernetes Secrets
- kubectl CLI
- Dapr CLI

## Sources Consulted
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL v2 state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Azure Cosmos DB state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr HashiCorp Vault secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr state key prefix strategies: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found

1. **Redis `keyPrefix` allowed values incomplete**: The comment listed `appid | name | none` but the actual allowed values are `appid | name | namespace | none`. Added the missing `namespace` option.

2. **PostgreSQL `schema` field does not exist**: The post listed `schema` with value `public` as a PostgreSQL v2 metadata field. This field does not exist in the PostgreSQL v2 component spec. Removed it.

3. **PostgreSQL `tableName` field does not exist**: The post listed `tableName` with value `dapr_state`. The correct field in PostgreSQL v2 is `tablePrefix`. Replaced `tableName` with `tablePrefix`.

4. **PostgreSQL `connMaxIdleTime` incorrect field name**: The correct field name is `connectionMaxIdleTime` (not `connMaxIdleTime`). Fixed the field name.

5. **PostgreSQL `connMaxLifetime` does not exist**: This field is not documented in the PostgreSQL v2 component spec. Removed it.

6. **Cosmos DB `partitionKey` is not a component metadata field**: `partitionKey` is used in per-request metadata at runtime, not as a component-level configuration field. The Cosmos DB component metadata table only includes: `url`, `masterKey`, `database`, `collection`, and `actorStateStore`. Removed from the component YAML example.

7. **Cosmos DB `operationTimeout` does not exist**: This field is not documented in the Cosmos DB component spec. Removed it.

8. **Cosmos DB `contentType` does not exist**: This field is not documented in the Cosmos DB component spec. Removed it.

## Review Notes
- The `keyPrefix` field is a general Dapr state management feature that works across all state stores, but it is not listed in individual component metadata tables. The post includes it under Redis and PostgreSQL sections, which is acceptable since it does function as component metadata — it's just documented in the state management how-to guides rather than on individual component pages.
- The `auth.secretStore` field (camelCase) was verified as correct per official documentation.
- All Redis metadata field names were verified as correct against the official docs.
- The advice about using string values for all metadata fields (including booleans and numbers) is accurate and important.
- The `dapr components -k` CLI command is confirmed valid for listing components in Kubernetes mode.
