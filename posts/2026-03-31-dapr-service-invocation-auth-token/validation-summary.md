# Validation Summary: How to Use Dapr Service Invocation with Authentication Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Service Invocation API
- Dapr API Token Authentication
- Dapr HTTP Middleware Pipeline (JWT Bearer)
- Dapr mTLS (Mutual TLS)
- Kubernetes Secrets
- Go (net/http)
- OAuth2 / OIDC (client credentials flow)

## Sources Consulted
- Dapr API Token Authentication docs — https://docs.dapr.io/operations/security/api-token/
- Dapr JWT Bearer Middleware reference — https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr Configuration overview (HTTP pipeline) — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr mTLS docs — https://docs.dapr.io/operations/security/mtls/
- Dapr Service Invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI reference (mtls subcommands) — https://docs.dapr.io/reference/cli/

## Issues Found

### 1. Incorrect token validation flow in sequence diagram (Critical)
**What was wrong:** The first Mermaid sequence diagram showed the `dapr-api-token` being forwarded from Sidecar A to Sidecar B, with Sidecar B performing the validation and stripping the token before forwarding to the app. This is incorrect — the `dapr-api-token` authenticates the calling app to its own **local** sidecar. Sidecar A validates the token; inter-sidecar communication uses mTLS, not API tokens.

**What was changed:** Updated the diagram so Sidecar A validates the token, then forwards the request to Sidecar B via mTLS. Removed the incorrect "token stripped" note from Sidecar B.

### 2. Incorrect token validation flow in graph diagram (Critical)
**What was wrong:** The second Mermaid graph (under "Mutual TLS as an Additional Layer") showed Sidecar B validating the API token (step 3), with the mTLS handshake happening before token validation. This reverses the actual flow.

**What was changed:** Reordered the steps so Sidecar A validates the API token (step 2), then the mTLS handshake occurs between sidecars (step 3), and Sidecar B forwards the clean request (step 4).

### 3. Misleading text about "target sidecar" requiring the token (Minor)
**What was wrong:** The text "When the target sidecar requires a token, the calling app must include `dapr-api-token` in every invocation request" implies the token is validated by the remote/target sidecar. The token is actually validated by the caller's own local sidecar.

**What was changed:** Reworded to "When the caller's sidecar is configured with an API token, the calling app must include `dapr-api-token` in every request to its local sidecar."

## Review Notes
- The `dapr mtls -k` command was valid in earlier Dapr CLI versions (v1.0–v1.12) for checking mTLS status. In newer CLI versions, the `dapr mtls` command group uses explicit subcommands (`export`, `expiry`, `renew-certificate`). The blog does not specify a Dapr version, so this was left as-is but may need updating for newer Dapr CLI versions.
- The exact output text shown (`mTLS is enabled in your Kubernetes cluster`) may differ from the actual CLI output (`Mutual TLS is enabled in your Kubernetes cluster`) depending on the Dapr CLI version.
- The statement "The application receives the request without needing to re-validate" regarding JWT middleware is technically correct but could be misleading — many apps still extract JWT claims for authorization decisions even if the middleware handles signature validation.
- The Go code example omits error handling (e.g., `req, _ := http.NewRequest(...)`) which is acceptable for brevity in a blog post but should not be used in production code.
- All Kubernetes YAML, component definitions, configuration resources, annotations, header names, environment variables, and API URL patterns were verified as correct against official Dapr documentation.
