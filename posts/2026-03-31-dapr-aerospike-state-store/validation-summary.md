# Validation Summary: How to Configure Dapr with Aerospike State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, component configuration)
- Aerospike (NoSQL database, state store)
- Docker (running Aerospike server)
- Kubernetes (applying Dapr component manifests)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP API (state save endpoint)
- aql (Aerospike Query Language CLI)

## Sources Consulted
- Dapr components-contrib source code for Aerospike state store (`github.com/dapr/components-contrib/state/aerospike/aerospike.go`) — verified metadata struct fields (`hosts`, `namespace`, `set` only)
- Dapr official documentation for Aerospike state store setup (`github.com/dapr/docs` — setup-aerospike.md)
- Dapr runtime component registration (`github.com/dapr/dapr/cmd/daprd/components/state_aerospike.go`) — confirmed component type name
- Dapr JavaScript SDK source (`@dapr/dapr` npm package) — verified `DaprClient` export, `state.save()`, and `state.get()` method signatures
- Aerospike Docker Hub image tags — verified available tags for `aerospike/aerospike-server`
- Dapr HTTP API reference — verified state save endpoint format

## Issues Found

1. **Fabricated `username` metadata field**: The blog included a `username` metadata field in the Dapr component YAML. The Aerospike state store component does not support this field — its metadata struct only accepts `hosts`, `namespace`, and `set`. The `Init()` function creates a client with `as.NewClientWithPolicyAndHost(nil, hostPorts...)` with no authentication configuration. **Removed the field.**

2. **Fabricated `password` metadata field with `secretKeyRef`**: Similarly, the blog included a `password` field with a Kubernetes secret reference. This field does not exist in the component. **Removed the field.**

3. **Non-existent Docker image tag**: The blog referenced `aerospike/aerospike-server:6.4.0`, but this exact tag does not exist on Docker Hub. Aerospike uses more specific patch tags like `6.4.0.33`. **Changed to `aerospike/aerospike-server` (defaults to latest) to avoid referencing a non-existent tag.**

4. **Component type casing**: The blog used `state.aerospike` (lowercase), but the official Dapr documentation uses `state.Aerospike` (capital A). While Dapr's component matching is case-insensitive in practice, the casing was updated to match official docs. **Changed to `state.Aerospike`.**

## Review Notes
- The Aerospike state store component does not currently support authentication. If users need authenticated Aerospike connections, they would need to contribute authentication support to the Dapr components-contrib project or use network-level security.
- The Dapr official docs also map port 3003 in addition to 3000-3002 when running Aerospike in Docker. The blog only maps three ports, which is sufficient for basic operation but slightly incomplete compared to the official guidance.
- The `aql` query `SELECT * FROM test.dapr-state LIMIT 10` uses a hyphenated set name. This is valid in Aerospike but may require quoting in some aql versions.
- The JavaScript code uses top-level `await`, which requires ES modules or an async wrapper function. This is a common pattern in tutorials and is acceptable.
