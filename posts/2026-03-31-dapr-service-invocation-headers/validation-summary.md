# Validation Summary: How to Pass Headers and Metadata in Dapr Service Invocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, middleware, tracing)
- HTTP headers and metadata
- Node.js (Express, axios)
- Go (net/http)
- curl
- YAML (Dapr Component configuration)

## Sources Consulted
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr HTTP middleware reference: https://docs.dapr.io/reference/components-reference/supported-middleware/
- Dapr routerchecker middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-routerchecker/
- Dapr OAuth2 client credentials middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2clientcredentials/
- Dapr Go SDK source (github.com/dapr/go-sdk): client.go, invoke.go
- Dapr Go SDK examples: https://github.com/dapr/go-sdk/blob/main/examples/service/client/main.go
- Dapr gRPC proxy issue (dapr/dapr#3561): gRPC metadata forwarding behavior

## Issues Found

### 1. Go SDK Example — Incorrect Header Passing Pattern (Fixed)
**What was wrong:** The Go example used `metadata.Pairs` and `metadata.NewOutgoingContext` from `google.golang.org/grpc/metadata` to set custom headers via gRPC transport metadata on `InvokeMethodWithContent`. This is not the idiomatic or reliable way to pass HTTP headers to a target service through Dapr. The gRPC metadata is sent to the local Dapr sidecar at the transport level, but `InvokeMethodWithContent` passes application-level headers via the protobuf `InvokeRequest.Metadata` field, not gRPC transport metadata. Additionally, `metadata.NewOutgoingContext` replaces all existing metadata, which can conflict with Dapr's own API token interceptor if `DAPR_API_TOKEN` is set.

**What was changed:** Replaced the gRPC-metadata-based Go SDK example with a standard `net/http` client example that calls the Dapr HTTP API directly (`http://localhost:3500/v1.0/invoke/...`), passing custom headers via `req.Header.Set()`. This approach is consistent with the curl and Node.js examples and guarantees headers are forwarded correctly.

### 2. Middleware Section — Wrong Middleware Type and Misleading Description (Fixed)
**What was wrong:** The section titled "Header Filtering with Middleware" claimed to show how to "add or remove headers globally" using `middleware.http.routerchecker`. In reality, `routerchecker` is a route validation middleware that checks URL paths against a regex pattern and blocks non-matching requests. It has nothing to do with headers. The component name "uppercase-transformer" was also misleading.

**What was changed:** Replaced the `routerchecker` component with `middleware.http.oauth2clientcredentials`, which actually adds an Authorization header (OAuth2 bearer token) to requests. Updated the section title to "Adding Headers with Middleware" and the description to accurately reflect what the middleware does. The YAML now shows correct metadata fields for the OAuth2 client credentials middleware (`clientId`, `clientSecret`, `scopes`, `tokenURL`, `headerName`).

## Review Notes
- The curl, Node.js (axios), and Express.js examples are all correct and use standard Dapr HTTP service invocation patterns.
- The Dapr-specific metadata headers table (`dapr-app-id`, `traceparent`, `tracestate`) is accurate.
- The claim that "HTTP headers on the outgoing request are automatically forwarded to the target service" is correct for Dapr HTTP service invocation.
- The `middleware.http.oauth2clientcredentials` middleware also supports an optional `authStyle` field (0=auto, 1=POST body, 2=HTTP Basic) and `pathFilter` field for selective application, which the post does not mention but could be useful in a follow-up.
