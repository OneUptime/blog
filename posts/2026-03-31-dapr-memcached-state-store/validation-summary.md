# Validation Summary: How to Configure Dapr with Memcached State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Memcached (in-memory caching system)
- Docker (for running Memcached)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP State API
- Kubernetes (for applying component manifests)

## Sources Consulted
- Dapr Memcached state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-memcached/
- Dapr supported state stores feature comparison table: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr state store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr State Management HTTP API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr JavaScript SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/

## Issues Found
1. **`ttlInSeconds` listed as component-level metadata**: The original component YAML included a `ttlInSeconds` metadata field. Per the official Dapr Memcached component reference, the only valid component-level metadata fields are `hosts`, `maxIdleConnections`, and `timeout`. TTL for Memcached is set per-request via the state API metadata (e.g., `"metadata": {"ttlInSeconds": "60"}`), not at the component configuration level. Removed `ttlInSeconds` from the component YAML and updated the accompanying text to clarify that TTL is set per-request.

## Review Notes
- The Dapr state store features table confirms Memcached supports CRUD and TTL, but does not support ETags, transactions, actors, or workflows. The blog's limitations section is accurate.
- The `timeout` metadata default is `1000` ms per official docs; the blog sets it to `5000`, which is a valid custom value, not an error.
- The `maxIdleConnections` default is `2` per official docs; the blog sets it to `10`, which is also a valid custom value.
- The Dapr JS SDK constructor syntax (`new DaprClient({ daprHost, daprPort })`) and state methods (`client.state.save()`, `client.state.get()`) are correct per official SDK documentation.
- The HTTP API endpoint format (`POST /v1.0/state/{store-name}`) and JSON body structure are correct.
- The Docker command and `nc` verification command are correct for running and testing Memcached.
- Memcached component is at stable status, component version v1, available since Dapr runtime 1.9.
