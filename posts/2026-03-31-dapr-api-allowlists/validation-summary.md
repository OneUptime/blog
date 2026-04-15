# Validation Summary: How to Restrict Dapr API Access with Allowlists

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Configuration resources (API allowlists)
- Kubernetes (kubectl, annotations, secrets)
- Dapr API token authentication

## Sources Consulted
- Dapr API Allowlist Documentation: https://docs.dapr.io/operations/configuration/api-allowlist/
- Dapr Configuration source code (`pkg/config/configuration.go`): https://github.com/dapr/dapr/blob/master/pkg/config/configuration.go
- Dapr endpoint group definitions (`pkg/api/http/endpoints/endpointgroup.go`): https://github.com/dapr/dapr/blob/master/pkg/api/http/endpoints/endpointgroup.go
- Dapr HTTP server route registration (`pkg/api/http/server.go`): https://github.com/dapr/dapr/blob/master/pkg/api/http/server.go
- Dapr API Token Authentication docs: https://docs.dapr.io/operations/security/api-token/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **Protocol values used wrong casing**: The YAML configuration examples used uppercase `HTTP` and `gRPC` for the `protocol` field. Dapr defines these constants as lowercase `http` and `grpc` in the source code. Fixed all occurrences to use lowercase values.

2. **Wrong HTTP status code for blocked APIs**: The post claimed blocked APIs return `403 Forbidden`. In reality, Dapr does not register blocked endpoints on the HTTP router at all, so requests to blocked APIs return `404 Not Found`. For gRPC, blocked calls return `Unimplemented`. Fixed both mentions (prose explanation and curl example comment).

3. **Incorrect pub/sub publish URL format**: The example used `http://localhost:3500/v1.0/publish/my-topic/orders`, where `my-topic` was placed in the pubsub component name position. The correct Dapr pub/sub URL format is `/v1.0/publish/{pubsubname}/{topic}`, so the first path segment after `/publish/` should be the component name (e.g., `my-pubsub`), not the topic. Fixed to `http://localhost:3500/v1.0/publish/my-pubsub/orders`.

4. **Incomplete API names table**: The table of available API names was missing 6 entries that exist in the Dapr source code: `unlock`, `subtlecrypto`, `healthz`, `jobs`, `shutdown`, and `conversation`. Added all missing entries to the table.

## Review Notes
- The post does not mention `spec.api.denied` (denylist), which is also supported by Dapr and overrides the allowlist for any APIs defined in both. This is a notable omission for a security-focused post but not a technical error in what is stated.
- The `dapr.io/api-token-secret` annotation and the overall Configuration resource structure were verified as correct.
- The Kubernetes commands (`kubectl apply`, `kubectl create secret`) are correct.
