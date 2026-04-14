# Validation Summary: How to Implement JWT Token Validation with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (middleware pipeline, sidecar, service invocation)
- JWT (JSON Web Tokens) / Bearer token authentication
- JWKS (JSON Web Key Set)
- Kubernetes (Deployments, annotations)
- Python / FastAPI
- Go (net/http)
- @clarketm/jwt-cli (npm package)

## Sources Consulted
- Dapr middleware component reference for `middleware.http.bearer`: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr bearer middleware source code (`middleware/http/bearer/bearer_middleware.go` and `metadata.go`) on GitHub
- Dapr Configuration spec for httpPipeline handlers: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- @clarketm/jwt-cli npm package: https://www.npmjs.com/package/@clarketm/jwt-cli

## Issues Found

### 1. MAJOR: Incorrect claim that Dapr forwards JWT claims as HTTP headers
- **What was wrong:** The post claimed Dapr forwards validated JWT claims as HTTP headers (`X-JWT-Sub`, `X-JWT-Email`, `X-JWT-Roles`). This is incorrect. Dapr's bearer middleware is a pass/fail gate only — it either rejects the request with 401 or passes the original request through unchanged. It does not extract or forward any claims as headers.
- **What was changed:** Rewrote the "Reading JWT Claims in Your Application" section (Python) and "Custom Claim Extraction Middleware" section (Go) to decode claims directly from the already-validated JWT in the `Authorization` header instead of reading nonexistent `X-JWT-*` headers. Updated the summary section to accurately describe Dapr's behavior.
- **Why:** The original code would silently fail — all `X-JWT-*` header reads would return empty strings/None, making the application unable to identify the user despite having a valid token.

### 2. MINOR: Incorrect jwt-cli flags
- **What was wrong:** The `jwt sign` command used `--expires` (should be `--expiresIn`), `--subject` as a flag (the subject should be part of the JSON payload), and `--private-key ./dev-private-key.pem` (the private key is passed as a positional argument, not via a flag).
- **What was changed:** Fixed the command to use the correct syntax: JSON payload as first positional argument, private key file as second positional argument, and `--expiresIn` instead of `--expires`.
- **Why:** The original command would fail with unrecognized flag errors.

### 3. MINOR: Inconsistent curl endpoint paths
- **What was wrong:** The FastAPI route was defined as `/api/profile` but the curl commands used `method/profile` in the Dapr invoke URL. The correct Dapr invoke path should include the full app route.
- **What was changed:** Updated curl commands to use `method/api/profile` to match the FastAPI route `/api/profile`.
- **Why:** Using `method/profile` would hit a non-existent endpoint and return a 404 from the app.

## Review Notes
- The `jwksURL` metadata field is optional in Dapr's bearer middleware. If omitted, Dapr auto-discovers the JWKS URL from the issuer's OpenID Configuration endpoint (`<issuer>/.well-known/openid-configuration`). The blog always provides it explicitly, which is fine but could be noted as optional.
- The Go example uses `context.WithValue` with a string key (`"userID"`), which is discouraged in production Go code — an unexported type should be used as the key to avoid collisions. This is a style concern, not a correctness issue, so it was left unchanged.
- The post does not mention that Dapr returns HTTP 500 (not 401) when the JWKS cache cannot be retrieved — a less common but possible error scenario.
