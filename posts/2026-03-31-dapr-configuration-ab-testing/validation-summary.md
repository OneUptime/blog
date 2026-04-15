# Validation Summary: How to Use Dapr Configuration for A/B Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API (HTTP)
- Redis (as Dapr configuration store)
- Python 3 (asyncio, dataclasses, hashlib)
- httpx (async HTTP client)
- FastAPI (web framework)
- prometheus_client (metrics/observability)

## Sources Consulted
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Configuration API overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/
- Dapr Redis configuration store component: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Other validated Dapr configuration posts in the same blog for consistency

## Issues Found

1. **Deprecated API endpoint version**: The post used `v1.0-alpha1` in the Configuration API URL. The Configuration API graduated to stable in Dapr v1.11, so the correct path is `/v1.0/configuration/{storename}`. Changed `v1.0-alpha1` to `v1.0`.

2. **Incorrect response JSON parsing**: The code parsed the Dapr Configuration API response using `resp.json().get("items", {})`, expecting an `"items"` wrapper. The actual response returns configuration keys as a flat map at the root level (e.g., `{"key": {"value": "..."}}`). Changed to `resp.json()`.

3. **Missing version in Redis values**: The Dapr Redis configuration store expects values in the format `value||version` (e.g., `"true||1"`). The post stored plain values like `"true"` and `"50"`, which would not be parsed correctly by the Dapr Redis component. Added version suffixes to all Redis SET commands.

4. **Contradictory experiment stopping logic**: The "Stopping an Experiment" section set `enabled` to `"false"` while commenting "serve variant B to everyone." However, the `assign_variant` function returns `"control"` when `enabled` is `false`, so variant B would never be served. Changed `enabled` to `"true"` so the 0/100 split actually routes all traffic to variant B. Also bumped version to `||2` to reflect the config update.

## Review Notes
- The `track_experiment_assignment` function accepts a `user_id` parameter but does not use it. This is acceptable since Prometheus counters should not use high-cardinality labels like user IDs, but the unused parameter could be confusing. Not changed since it may be used for logging or other tracking in a real implementation.
- The hashing approach (SHA-256 mod 100) provides reasonable distribution for A/B test bucketing but is not cryptographically necessary for this use case. A simpler hash could suffice, but SHA-256 is not incorrect.
- The post does not show the Dapr component YAML for configuring the Redis configuration store, which would be helpful for a complete tutorial. Not added since this is a style/completeness concern, not a technical error.
