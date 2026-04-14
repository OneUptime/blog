# Validation Summary: How to Configure Dapr Sidecar API Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sidecar Configuration CRD
- Kubernetes annotations for Dapr
- HTTP and gRPC API access control

## Sources Consulted
- Dapr official documentation: API allowlists configuration (https://docs.dapr.io/operations/configuration/api-allowlist/)
- Dapr source code: `pkg/config/configuration.go` for `APISpec`, `APIAccessRule` struct definitions
- Dapr source code: `pkg/api/http/endpoints.go` for HTTP route registration behavior
- Dapr source code: `pkg/api/grpc/endpoints.go` for gRPC endpoint blocking behavior
- Dapr source code: `pkg/messages/errorcodes/` for error code definitions
- Dapr annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)

## Issues Found

1. **Incorrect HTTP API version format**: All configuration examples used `version: v1` for HTTP protocol entries. The correct version for HTTP APIs is `v1.0`. gRPC correctly uses `v1`. Fixed all YAML examples to use `v1.0` for HTTP and `v1` for gRPC.

2. **Incorrect protocol casing**: All examples used uppercase `HTTP` and mixed-case `gRPC` for the protocol field. The official documentation and source code use lowercase `http` and `grpc`. While Dapr does case-insensitive comparison internally, the canonical form is lowercase. Fixed all examples to use lowercase.

3. **Wrong HTTP status code for blocked APIs**: The post claimed restricted APIs return HTTP 403 Forbidden. In reality, for HTTP, Dapr simply does not register routes for blocked APIs, resulting in a 404 Not Found. For gRPC, blocked APIs return 501 Not Implemented. Fixed the prose and test section to reflect this.

4. **Fabricated error response**: The post showed an expected error response `{"errorCode":"ERR_API_UNALLOWED","message":"state API is not allowed"}`. The error code `ERR_API_UNALLOWED` does not exist in the Dapr codebase. Additionally, the test curl command was hitting the pubsub endpoint but the error message referenced "state API", which was internally inconsistent. Replaced the fabricated JSON error response with an accurate description of the 404 behavior.

5. **Wrong API name `pubsub`**: The correct API name for publish/subscribe in Dapr's allowlist configuration is `publish`, not `pubsub`. Fixed in the API names list and the HTTP/gRPC example.

6. **Wrong API name `workflow`**: The correct API name is `workflows` (plural), not `workflow`. Fixed in the API names list.

7. **Missing `unlock` API name**: The post listed `lock` but omitted `unlock`, which is a separate API name in Dapr's configuration. Added `unlock` to the list.

## Review Notes
- The post omits several other valid API names that could be used in allowlists/blocklists, including `invoke`, `metadata`, `subtlecrypto`, `healthz`, `shutdown`, `conversation`, and `subscribe` (gRPC only). The post's list is not exhaustive but covers the most commonly used APIs. A future update could note that this is a subset of available API names.
- The overall structure and security advice in the post is sound — the principle of least-privilege API access is a valid and important Dapr security pattern.
