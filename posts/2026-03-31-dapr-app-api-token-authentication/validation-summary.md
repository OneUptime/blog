# Validation Summary: How to Configure App API Token Authentication in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (secrets, annotations, deployments)
- Node.js / Express.js
- Go (net/http)
- Bash / curl

## Sources Consulted
- Dapr official docs: Authenticate requests from Dapr using token authentication — https://docs.dapr.io/operations/security/app-api-token/
- Dapr official docs: Enable API token authentication in Dapr — https://docs.dapr.io/operations/security/api-token/
- Dapr official docs: Environment variable reference — https://docs.dapr.io/reference/environment/
- Microsoft Learn: Enable Token Authentication for Dapr Requests — https://learn.microsoft.com/en-us/azure/container-apps/dapr-authentication-token

## Issues Found

1. **Incorrect description metadata**: The frontmatter description stated "so the sidecar validates a secret token before forwarding requests to your application," which incorrectly describes the mechanism. The sidecar does not validate a token — it *includes* the token in requests it forwards, and the *application* validates it. Fixed to: "so the sidecar includes a secret token with every request it forwards to your application, which your app validates before processing."

2. **Go code security bug — missing empty-string check**: The Go `validateToken` middleware compared the incoming header token directly against the expected env var value (`token != expected`). If both the `dapr-api-token` header is absent (Go's `Header.Get` returns `""`) and the `APP_API_TOKEN` env var is unset (also `""`), the comparison `"" != ""` evaluates to `false`, allowing unauthenticated requests through. The JavaScript example already handled this correctly with `!token || token !== APP_TOKEN`. Added `token == ""` guard to the Go example to match.

## Review Notes
- All Dapr-specific details are accurate: the `dapr-api-token` header name, the `dapr.io/app-token-secret` Kubernetes annotation, the `APP_API_TOKEN` environment variable, and the Kubernetes secret key name `token` all match official documentation.
- The overview and body text correctly explain the directionality of app API token auth (sidecar-to-app) versus Dapr API token auth (client-to-sidecar).
- The Go example reads `APP_API_TOKEN` from the environment on every request rather than once at startup. This works but is slightly inefficient; not a correctness issue.
