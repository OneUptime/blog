# Validation Summary: How to Configure Dapr API Allowlists

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Configuration resources (API allowlists / allowed API policies)
- Kubernetes (Deployment annotations for Dapr sidecar)
- Dapr self-hosted mode

## Sources Consulted
- Dapr official documentation: API allowlist configuration (https://docs.dapr.io/operations/configuration/api-allowlist/)
- Dapr official documentation: Configuration overview (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr source code: API access rule constants and endpoint registration logic (github.com/dapr/dapr)
- Dapr Configuration resource schema reference

## Issues Found

1. **Incorrect pub/sub API name**: The blog used `pubsub` as the API name in all YAML examples and the reference table. The correct Dapr API name for pub/sub is `publish`. Fixed all occurrences.

2. **Wrong HTTP status code for blocked APIs**: The blog claimed blocked APIs return `403 Forbidden`. In reality, blocked HTTP endpoints are never registered with the router, so they return `404 Not Found`. Blocked gRPC endpoints return `Unimplemented`. Fixed the explanation and test example.

3. **Incorrect version format for HTTP APIs**: The blog used `v1` for HTTP protocol entries. Dapr HTTP APIs use `v1.0` (with dot), while gRPC APIs use `v1` (without dot). Fixed all YAML examples to use `v1.0` for `http` protocol and `v1` for `grpc` protocol.

4. **Wrong protocol case in YAML**: The blog used uppercase `HTTP` and `gRPC` for protocol values. The official Dapr documentation and source code use lowercase `http` and `grpc`. Fixed all occurrences.

5. **Incorrect field name in prose**: The blog text said "Create a Configuration resource with an `allowedAPIs` section" but the actual YAML field path is `api.allowed`. Fixed the text.

6. **Incomplete API names table**: The reference table was missing several valid API names: `unlock`, `crypto`, `subtlecrypto`, `jobs`, `shutdown`, and `conversation`. Added these to the table.

## Review Notes
- The `accessControl` section shown in the "Combine with ACLs" example is structurally valid but is a partial snippet (missing `apiVersion`, `kind`, `metadata`). This is acceptable since the surrounding text makes clear it's showing just the `spec` portion.
- The blog correctly notes that Dapr performs case-insensitive protocol matching internally, but using lowercase matches the canonical documentation style.
- The "Full API Config" example title says "state, pub/sub, and bindings" but also includes secrets, metadata, and healthz. This is a minor prose inconsistency but not a technical error.
