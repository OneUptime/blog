# Validation Summary: How to Set State Store TTL in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- Dapr HTTP API (state save/get endpoints)
- Dapr Python SDK (`dapr-client`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Redis (as backing state store)
- PostgreSQL (as backing state store)

## Sources Consulted
- Dapr State Store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Go SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/

## Issues Found

1. **Redis component-level TTL field name was incorrect.** The post used `defaultTTLInSeconds` as the metadata field name in the Redis component YAML. The official Dapr Redis state store docs specify the field as `ttlInSeconds`. Using the wrong field name would cause the default TTL to be silently ignored. Changed `defaultTTLInSeconds` to `ttlInSeconds`.

2. **"Reading TTL Remaining" section was misleading.** The post claimed you could check TTL remaining using a `metadata.rawPayload` HTTP header on the state GET endpoint. Dapr's state GET API does not expose remaining TTL information, and `rawPayload` is unrelated to TTL. Rewrote the section to accurately explain that Dapr does not expose TTL remaining, and provided a workaround (storing expiration timestamp in the value, or querying the backing store directly).

3. **Go SDK used `SaveStateWithETag` unnecessarily.** The post used `client.SaveStateWithETag(ctx, ..., "", meta)` with an empty ETag string when no ETag-based concurrency was needed. The official Dapr TTL documentation uses the simpler `client.SaveState(ctx, storeName, key, data, meta)` method. Changed to `SaveState` for correctness and clarity.

## Review Notes
- The PostgreSQL component YAML uses `version: v1`, while current Dapr documentation primarily documents the `v2` variant. The `cleanupInterval` field applies to both, but readers using the latest Dapr may want to use `state.postgresql.v2`.
- The `json` import in the Python HTTP example (line 3) is unused since the `requests` library handles JSON serialization via the `json=payload` parameter. This is cosmetic and was not changed.
- All other code examples (HTTP API, Python SDK, Node.js SDK), component configurations, and technical explanations were verified as accurate.
