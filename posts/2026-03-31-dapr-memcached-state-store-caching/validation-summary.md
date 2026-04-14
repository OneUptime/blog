# Validation Summary: How to Use Memcached as Dapr State Store for Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- Memcached
- Kubernetes (Helm deployment)
- Python (Dapr Python SDK)
- Go (Dapr Go SDK)
- Bitnami Memcached Helm chart

## Sources Consulted
- Dapr Memcached state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-memcached/
- Dapr components-contrib source (state/memcached/memcached.go): https://github.com/dapr/components-contrib/blob/master/state/memcached/memcached.go
- Dapr state store feature matrix: https://github.com/dapr/docs/blob/v1.17/daprdocs/data/components/state_stores/generic.yaml
- Dapr Python SDK source (grpc/client.py): https://github.com/dapr/python-sdk
- Dapr Go SDK source (client/state.go): https://github.com/dapr/go-sdk
- Bitnami Memcached Helm chart: https://artifacthub.io/packages/helm/bitnami/memcached
- Bitnami Memcached chart values.yaml: https://github.com/bitnami/charts/blob/main/bitnami/memcached/values.yaml

## Issues Found

### 1. Incorrect `timeout` value format in component YAML
- **What was wrong:** The `timeout` metadata field was set to `"1000ms"` (a duration string).
- **What was changed:** Corrected to `"1000"` (plain integer representing milliseconds).
- **Why:** The Dapr Memcached component parses the timeout value using `strconv.Atoi()` and then multiplies by `time.Millisecond`. A value like `"1000ms"` would cause a parsing error.

### 2. Invalid `ttlInSeconds` as component-level metadata
- **What was wrong:** `ttlInSeconds` was listed as a component-level metadata field in the Dapr component YAML.
- **What was changed:** Removed `ttlInSeconds` from the component YAML metadata section.
- **Why:** The official Dapr documentation lists only three component metadata fields for `state.memcached`: `hosts`, `maxIdleConnections`, and `timeout`. `ttlInSeconds` is a per-request metadata field passed on individual save operations, not a component-level configuration. The source code confirms it is read from `req.Metadata`, not the component metadata struct.

### 3. Incorrect Python SDK parameter name for state metadata
- **What was wrong:** The Python `save_state` call used `metadata={"ttlInSeconds": "300"}`.
- **What was changed:** Corrected to `state_metadata={"ttlInSeconds": "300"}`.
- **Why:** In the Dapr Python SDK, the `metadata` parameter on `save_state` is deprecated gRPC-level metadata. State-level metadata (like TTL) must be passed via the `state_metadata` parameter.

### 4. Missing `"fmt"` import in Go code
- **What was wrong:** The Go code used `fmt.Sprintf()` but did not include `"fmt"` in the import block.
- **What was changed:** Added `"fmt"` to the import statement.
- **Why:** Go requires all used packages to be explicitly imported. The code would not compile without this import.

## Review Notes
- The Python import style `import dapr.clients as dapr` works but is non-idiomatic. The official SDK examples use `from dapr.clients import DaprClient`. This is a style preference, not a bug, so it was left unchanged.
- The claim that "Memcached uses consistent hashing to distribute keys across nodes" is a slight simplification — consistent hashing is typically implemented client-side. However, the Dapr component handles this transparently, so the statement is acceptable in context.
- The Memcached limitations section correctly states that ETags, transactions, persistence, and strong consistency are not supported. This is confirmed by the Dapr feature matrix (`etag: false`, `transactional: false`).
- The Bitnami Helm chart commands are all correct, including the `architecture=high-availability` parameter which is a documented valid value.
