# Validation Summary: How to Use Dapr Service Invocation with HTTP Middleware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP middleware pipelines
- Dapr Configuration CRD (`httpPipeline`, `appHttpPipeline`)
- Dapr middleware components: bearer, ratelimit, OAuth2, OAuth2 Client Credentials, OPA, Sentinel, Wasm, uppercase
- Kubernetes (annotations for Dapr sidecar injection)
- Open Policy Agent (OPA) with Rego policy language
- WebAssembly (Wasm) custom middleware
- OAuth2 Authorization Code and Client Credentials flows

## Sources Consulted
- Dapr middleware concept documentation (https://docs.dapr.io/concepts/middleware-concept/)
- Dapr Configuration spec documentation (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr rate limit middleware reference (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/)
- Dapr bearer (OpenID Connect) middleware reference (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/)
- Dapr OAuth2 middleware reference (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2/)
- Dapr OAuth2 Client Credentials middleware reference (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2clientcredentials/)
- Dapr OPA middleware reference (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-opa/)
- Dapr Wasm middleware reference (https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-wasm/)
- Dapr CLI reference for `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)

## Issues Found

1. **OAuth2 middleware description was incorrect.** The table described `middleware.http.oauth2` as "Validate OAuth2 bearer tokens." In reality, it enables the OAuth2 Authorization Code flow (redirect-based login), not bearer token validation. Bearer token validation is handled by `middleware.http.bearer`. Changed to "Enable OAuth2 Authorization Code flow."

2. **OAuth2 Client Credentials `clientID` field name was wrong.** The blog used `clientID` (capital D), but the official Dapr docs specify `clientId` (lowercase d). Changed to `clientId`.

3. **OAuth2 Client Credentials `authStyle` comment was incorrect.** The blog comment stated `1 = in header, 2 = in params`, which is backwards. Per the official docs: `0` = auto-detect, `1` = POST body params, `2` = Basic Auth header. Updated the comment to reflect the correct values.

4. **Wasm middleware `guest` field name was wrong.** The blog used `guest`, but the official Dapr docs specify the field name as `guestConfig`. Changed to `guestConfig`.

## Review Notes
- The middleware execution order description ("top-to-bottom for inbound, bottom-to-top for responses") is technically accurate based on Go's `net/http` handler chaining model used by Dapr, though this exact phrasing is not stated verbatim in official docs.
- All YAML configurations use the correct `apiVersion: dapr.io/v1alpha1` and `kind: Component` / `kind: Configuration` resource types.
- The Kubernetes annotation `dapr.io/config` for attaching a Configuration to a pod is correct.
- The OPA Rego policy input structure (`input.request.method`, `input.request.headers`) matches the documented OPA middleware input schema.
- The `dapr run --config` CLI flag usage is correct for self-hosted mode.
