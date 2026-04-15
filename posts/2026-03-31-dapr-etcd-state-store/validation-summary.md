# Validation Summary: How to Configure Dapr with etcd State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- etcd (distributed key-value store, v3.4+)
- Kubernetes
- Docker
- JavaScript (fetch API)

## Sources Consulted
- Dapr etcd state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-etcd/
- Dapr component schema specification: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr state store setup guide: https://docs.dapr.io/operations/components/setup-state-store/
- etcd Docker image registry: https://quay.io/repository/coreos/etcd

## Issues Found

1. **Undocumented metadata fields `dialTimeout` and `operationTimeout`**: The YAML component configuration included `dialTimeout` and `operationTimeout` metadata fields that are not part of the official Dapr etcd state store component specification. Removed both fields to match the documented API surface (`endpoints`, `keyPrefixPath`, `tlsEnable`, `ca`, `cert`, `key`).

2. **Deprecated component version `v1`**: The component manifest used `version: v1`, which is deprecated. Changed to `version: v2` per official Dapr documentation, which recommends v2 to avoid data inconsistencies with Actor TTLs (from Dapr v1.12 onwards). Note: v1 and v2 are incompatible with no data migration path.

3. **Mislabeled code example ("Go SDK" with JavaScript code)**: The text introduced a JavaScript `fetch` code block as "Or using the Go SDK:" — changed to "Or using JavaScript:" to accurately describe the code shown.

## Review Notes
- The etcd Docker image `quay.io/coreos/etcd:v3.5.0` is valid but is a specific older release. Users may want to use a more recent v3.5.x patch release for security fixes.
- The TLS configuration snippet correctly uses Dapr's `secretKeyRef` pattern for referencing Kubernetes secrets.
- The Dapr HTTP API paths (`/v1.0/state/{storename}` for POST and GET) are correct.
- The `apiVersion: dapr.io/v1alpha1` is the current and correct API version for Dapr component manifests.
