# Validation Summary: How to Configure Dapr with Apache Cassandra State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Apache Cassandra (state store)
- Docker (local Cassandra setup)
- Kubernetes (secret management)
- DataStax Astra DB (managed Cassandra)
- CQL (Cassandra Query Language)

## Sources Consulted
- Dapr Cassandra state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-cassandra/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Cassandra component source code (components-contrib): https://github.com/dapr/components-contrib/blob/master/state/cassandra/cassandra.go

## Issues Found

1. **Fabricated metadata fields `reconnectionPolicy` and `maxReconnectionAttempts`**: The component YAML included `reconnectionPolicy: "constant"` and `maxReconnectionAttempts: "3"`. These are not supported metadata fields in the Dapr Cassandra state store component. The supported fields are: `hosts`, `port`, `username`, `password`, `protoVersion`, `consistency`, `table`, `keyspace`, `replicationFactor`, and `enableHostVerification`. Removed both fields from the component configuration.

2. **Fabricated metadata field `enableTLS` in DataStax Astra section**: The Astra DB connection example included `enableTLS: "true"`. This field does not exist in the Dapr Cassandra component. The only SSL-related option is `enableHostVerification` (for SSL host verification). Removed the `enableTLS` line from the Astra configuration example.

3. **Non-existent `updatetime` column in SQL query**: The "Inspecting Cassandra State" section referenced `SELECT key, updatetime FROM dapr_state`. The Dapr Cassandra table schema only has two columns: `key` (text) and `value` (blob). There is no `updatetime` column. Changed the query to `SELECT key, value FROM dapr_state LIMIT 20;`.

## Review Notes
- The DataStax Astra DB section is plausible but may not work out-of-the-box since Astra typically requires a secure connect bundle for TLS connections, which the Dapr Cassandra component does not natively support. Readers connecting to Astra may need additional configuration or a proxy.
- Dapr prefixes state keys with the app-id (e.g., `myapp||sensor:device-001:latest`). The CQL query `WHERE key = 'sensor:device-001:latest'` may not return results unless the key prefix strategy is set to `none`. This is a common gotcha not mentioned in the post.
- The default table name in Dapr's Cassandra component is `items`, not `dapr_state`. The post explicitly sets `table: "dapr_state"` in the component config, so the CQL queries are consistent, but readers should be aware of the default.
- The default consistency level is `All`, not `Quorum`. The post sets `Quorum` explicitly which is fine, but the "Tuning Consistency" section could benefit from noting the default.
