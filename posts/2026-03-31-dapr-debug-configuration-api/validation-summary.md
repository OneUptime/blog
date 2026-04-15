# Validation Summary: How to Debug Configuration API Issues in Dapr

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Configuration API, sidecar)
- Redis (as configuration store backend)
- PostgreSQL (as configuration store backend, mentioned briefly)
- Kubernetes (kubectl commands for debugging)

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr v1.11.0 release notes (Configuration API promoted to stable): https://github.com/dapr/dapr/releases/tag/v1.11.0
- Dapr Configuration Quickstart: https://docs.dapr.io/getting-started/quickstarts/configuration-quickstart/
- Dapr How-To: Manage Configuration: https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Redis Configuration Store component reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr PostgreSQL Configuration Store component reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/postgresql-configuration-store/
- Dapr components-contrib source (configuration/redis/internal/redis_value.go): https://github.com/dapr/components-contrib/blob/main/configuration/redis/internal/redis_value.go
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/pubsub/keyspace-notifications/

## Issues Found

### 1. Outdated API endpoint version (High severity)
- **What was wrong:** The post used `v1.0-alpha1` for the Configuration API endpoint in three places (the curl debugging command, and the health check script). The Configuration API was promoted from alpha to stable in Dapr v1.11 (mid-2023), making `v1.0-alpha1` outdated for a March 2026 post.
- **What was changed:** Replaced `v1.0-alpha1` with `v1.0` in all three occurrences.
- **Why:** Using the alpha endpoint may not work on newer Dapr installations where alpha endpoints could be disabled, and it misleads readers into thinking the API is still experimental.

### 2. Incorrect Redis key format for configuration store (Critical severity)
- **What was wrong:** The post claimed that Redis configuration store keys use the format `<app-id>||<key>` (e.g., `myservice||my-key`). This is incorrect — that format belongs to the Dapr **state store**, not the configuration store. The configuration store uses plain key names. The `||` separator in the configuration store is used in the **value** (`value||version`), not the key.
- **What was changed:** Rewrote the "Debugging Missing Key Returns" section to show the correct plain key format and the `value||version` value convention. Updated the subscription debugging example to use plain keys with versioned values. Updated the summary paragraph to reference the correct `value||version` format instead of "app ID prefix".
- **Why:** Following the original advice would cause users to create keys with `appid||` prefixes that the Configuration API would never find, making the debugging guide actively counterproductive.

## Review Notes
- The `KEA` setting for Redis `notify-keyspace-events` is correct and functional, though broader than strictly necessary. A more minimal setting like `Kg` would also work. The current recommendation is safe.
- The `__keyevent@0__:set` subscription channel is correct for monitoring SET events on database 0. Note this only monitors database 0 — if Redis is configured to use a different database, the `@0` would need to change accordingly.
- The post focuses on Redis as the primary configuration store backend. PostgreSQL is mentioned only briefly in the YAML mistakes section. This is reasonable since Redis is the most commonly used configuration store with Dapr.
