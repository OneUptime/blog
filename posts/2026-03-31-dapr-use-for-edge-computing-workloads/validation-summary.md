# Validation Summary: How to Use Dapr for Edge Computing Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar, state management, pub/sub)
- SQLite (state store for offline operation)
- MQTT (pub/sub for cloud synchronization)
- K3s (lightweight Kubernetes for edge)
- Python (sensor data collection examples)

## Sources Consulted
- Dapr CLI reference — `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr self-hosted mode without Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr SQLite state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlite/
- Dapr state management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr state query API: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr MQTT3 pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found

1. **`--components-path` flag is deprecated (line 29):** The `dapr run` command used `--components-path`, which has been deprecated in favor of `--resources-path`. Changed to `--resources-path ./components`.

2. **Invalid Helm value `dapr_placement.replicaCount=1` (line 139):** The Dapr placement service does not support a `replicaCount` Helm value. Its scaling is controlled by `global.ha.enabled` or `dapr_placement.ha` (boolean). Since `global.ha.enabled=false` was already set on a previous line (which ensures single-replica placement), the invalid `--set dapr_placement.replicaCount=1` line was removed.

3. **SQLite state store does not support the query API (lines 76–99):** The `sync_to_cloud()` function used `POST /v1.0/state/localstore/query` with an EQ filter to find unsynced readings. This has two problems: (a) the SQLite state store does not implement the queryable interface — only Azure Cosmos DB, Redis, and SQL Server support state queries; (b) the query API endpoint uses `/v1.0-alpha1/`, not `/v1.0/`. Rewrote the sync logic to use a pending-keys pattern: `collect_and_store()` now appends each new key to a `pending-keys` list in state, and `sync_to_cloud()` iterates that list, fetches each reading by key with `GET /v1.0/state/localstore/{key}`, publishes it, and removes successfully synced keys from the pending list.

## Review Notes
- The state query API (`/v1.0-alpha1/state/.../query`) is still in alpha status across all supported stores. If future Dapr versions promote it to stable or add SQLite support, the query-based approach could be revisited.
- The `cleanSession: "true"` setting on the MQTT3 component means the broker will not persist subscriptions or queue messages while the edge device is offline. For edge scenarios where the device should receive missed messages on reconnect, `cleanSession: "false"` would be more appropriate.
- The Kubernetes Deployment YAML for resource limits is a partial snippet (missing `spec.template.spec.containers`). This is acceptable for a focused example but readers should note it is not a complete manifest.
- The `caCert` field using `secretKeyRef` is valid but the component is missing `auth.secretStore` — this works on Kubernetes (where it defaults to the `kubernetes` secret store) but would need to be specified for standalone mode.
