# Validation Summary: How to Implement Feature Flags with Dapr Configuration API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API (stable, v1.0)
- Redis (as configuration store backend)
- Azure App Configuration (as alternative backend)
- Python / Flask
- Azure CLI

## Sources Consulted
- Dapr Configuration API HTTP reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Configuration API overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr Redis Configuration component spec: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr Azure App Configuration component spec: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/azure-appconfig-configuration-store/
- Dapr Configuration API gRPC protobuf definitions (for subscription callback payload structure)
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found

### 1. Incorrect GET Configuration response parsing
- **What was wrong:** In `load_initial_flags()`, the code parsed the GET configuration response with `resp.json().get("items", {})`. The Dapr Configuration API GET endpoint (`/v1.0/configuration/{store}`) returns a flat map of key-to-item objects at the top level — there is no `"items"` wrapper. This code would always return an empty dict, meaning no flags would ever be loaded on startup.
- **What was changed:** Changed `resp.json().get("items", {})` to `resp.json()` to correctly parse the flat map response.
- **Why:** The `"items"` wrapper only exists in the subscription callback payload, not in the GET response. The GET response structure is `{ "keyName": { "value": "...", "version": "...", "metadata": {} } }`.

### 2. Non-deterministic hash for percentage-based rollout
- **What was wrong:** The code used Python's built-in `hash(user_id) % 100` for percentage-based rollout. Since Python 3.3, `hash()` is randomized by default via `PYTHONHASHSEED`, meaning the same user_id produces different hash values across process restarts and across different service instances. This would cause inconsistent rollout behavior — a user might see a feature on one request but not the next, or see it on one instance but not another.
- **What was changed:** Replaced `hash(user_id) % 100` with `int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 100` and added `import hashlib` to the imports.
- **Why:** SHA-256 is deterministic and produces consistent results across all Python processes, instances, and restarts, which is essential for consistent feature flag rollout behavior.

## Review Notes
- The subscription callback handler correctly uses `update.get("items", {})` — unlike the GET response, the subscription callback payload does wrap items in an `"items"` field per the Dapr protobuf definitions.
- The Redis configuration component YAML, metadata fields (`redisHost`, `redisPassword`, `enableTLS`), and component type (`configuration.redis`) are all correct per official docs.
- The Azure App Configuration component type (`configuration.azure.appconfig`) and metadata fields are correct, though this component is still in alpha status.
- The `az appconfig kv set` CLI command syntax is correct.
- The Dapr HTTP API paths (`/v1.0/configuration/{store}`, `/v1.0/configuration/{store}/subscribe`) and the subscription callback path (`/configuration/{store}/{id}`) are all correct.
- For production use, the blog could mention that Redis keyspace notifications must be enabled for subscriptions to work (Dapr may auto-configure this depending on Redis permissions).
