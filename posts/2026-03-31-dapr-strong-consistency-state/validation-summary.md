# Validation Summary: How to Use Strong Consistency for Dapr State Operations

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Dapr State Management API (HTTP and gRPC)
- Dapr Python SDK (`dapr-client`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Redis (Sentinel mode) as a Dapr state store
- PostgreSQL as a Dapr state store
- Strong vs. eventual consistency in distributed systems

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Store components: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Python SDK source and API: https://github.com/dapr/python-sdk
- Dapr Go SDK source and API: https://github.com/dapr/go-sdk
- Cross-referenced with existing validated blog posts in this repo: `dapr-state-transactions`, `dapr-state-management-python`, `dapr-state-management-redis`

## Issues Found

### 1. Go SDK example used incorrect API pattern
**What was wrong:** The Go SDK example called `SaveState` without consistency options, then demonstrated `SaveStateWithETag` with a struct-based `StateOptions` argument. `SaveStateWithETag` is not the standard/idiomatic method in the current Dapr Go SDK, and the first `SaveState` call did not actually apply strong consistency.

**What was changed:** Replaced both calls with a single `SaveBulkState` call using a `SetStateItem` struct that includes `Options: &dapr.StateOptions{...}` with the strong consistency and last-write concurrency settings. This pattern is consistent with the Go SDK's `StateOperation`/`SetStateItem` usage seen in other validated posts.

### 2. Redis component config included invalid `replicaCount` field
**What was wrong:** The Redis Sentinel component YAML included a `replicaCount` metadata field, which is not a recognized metadata key for the Dapr `state.redis` component.

**What was changed:** Removed the `replicaCount` metadata entry. The valid Sentinel configuration fields are `redisHost` (pointing to sentinel), `sentinelMasterName`, and optionally `redisPassword`.

### 3. Python `execute_state_transaction` used raw dicts instead of SDK types
**What was wrong:** The `transfer_funds` example passed raw Python dicts (with `"operation"` and `"request"` keys) to `execute_state_transaction`. The Dapr Python SDK expects `TransactionalStateOperation` objects, not dicts. This code would raise an `AttributeError` at runtime.

**What was changed:** Replaced the raw dicts with proper `TransactionalStateOperation` objects imported from `dapr.clients.grpc._request`, using `OperationType.upsert` for the operation type, `.encode()` on serialized JSON data, and the `etag` parameter for optimistic concurrency. This pattern is consistent with the Python SDK transaction usage in other validated blog posts.

## Review Notes
- The HTTP API examples (save and get with consistency options) are correct and match the Dapr state management API spec.
- The Python SDK `save_state` and `get_state` examples use the correct parameter names (`options` for `save_state`, `state_options` for `get_state`) matching the SDK's asymmetric naming.
- The comparison table between strong and eventual consistency is accurate and well-structured.
- The PostgreSQL component configuration and the note about `synchronous_commit=on` being the default are correct.
- The performance comparison using `time curl` is a reasonable approach for quick latency measurement, though it measures round-trip time including HTTP overhead, not just state store latency.
