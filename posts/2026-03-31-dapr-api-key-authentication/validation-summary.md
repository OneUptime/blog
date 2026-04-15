# Validation Summary: How to Implement API Key Authentication with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar-based microservices runtime)
- Dapr API token authentication
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Secrets API / Kubernetes secrets store
- Kubernetes Secrets
- Go (net/http middleware pattern)
- kubectl CLI

## Sources Consulted
- Dapr supported middleware components list: https://docs.dapr.io/reference/components-reference/supported-middleware/
- Dapr API token authentication docs: https://docs.dapr.io/operations/security/api-token/
- Dapr app API token authentication docs: https://docs.dapr.io/operations/security/app-api-token/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK secret.go source: https://github.com/dapr/go-sdk/blob/main/client/secret.go
- Dapr middleware configuration docs: https://docs.dapr.io/operations/components/middleware/

## Issues Found

### 1. `middleware.http.apikey` does not exist (Critical)
**What was wrong:** The post presented `middleware.http.apikey` as a built-in Dapr middleware component, including a full Component YAML definition with fabricated metadata fields (`headerName`, `apiKey` with `secretKeyRef`). This component type does not exist in Dapr. The official supported HTTP middleware types are: OAuth2, OAuth2 Client Credentials, OpenID Connect Bearer, Rate Limit, OPA, Router Alias, RouterChecker, Sentinel, Uppercase, and Wasm.

**What was changed:** Replaced the fabricated middleware component sections with Dapr's actual built-in API token authentication mechanism, which uses the `dapr.io/api-token-secret` annotation on Kubernetes Deployments and the `dapr-api-token` HTTP header.

### 2. httpPipeline Configuration referenced non-existent middleware (Critical)
**What was wrong:** The Configuration YAML showed an httpPipeline handler of type `middleware.http.apikey`, which cannot work since this middleware type does not exist.

**What was changed:** Removed the fabricated Configuration YAML and replaced the section with the correct Deployment annotation approach (`dapr.io/api-token-secret`), which is how Dapr actually enables API token authentication.

### 3. Wrong header name for authentication (Moderate)
**What was wrong:** The testing section used `X-API-Key` as the authentication header. Dapr's built-in token authentication uses the `dapr-api-token` header.

**What was changed:** Updated curl examples to use `dapr-api-token` header.

### 4. Incorrect API token rotation claim (Moderate)
**What was wrong:** The rotation example claimed "both old and new keys valid during rotation" when using `kubectl patch`. In reality, `kubectl patch` replaces the secret value immediately, and the Dapr sidecar must be restarted to pick up the new token value.

**What was changed:** Updated the rotation comment and added the required `kubectl rollout restart` command after patching the secret.

### 5. Secret creation format updated (Minor)
**What was wrong:** The secret used `openssl rand -hex 32` and a key name of `key`. Dapr's API token authentication expects the secret data key to be named `token`, and Dapr recommends generating tokens with `openssl rand 16 | base64`.

**What was changed:** Updated the secret creation command to use the correct key name (`token`) and Dapr's recommended generation method.

## Review Notes
- The Go custom middleware section for multi-key validation was technically correct and left unchanged. The Dapr Go SDK's `GetSecret` method signature (`func GetSecret(ctx, storeName, key string, meta map[string]string) (map[string]string, error)`) was verified against the source code.
- The Kubernetes Secret YAML for multiple keys was correct and left unchanged.
- The Dapr service invocation URL format (`http://localhost:3500/v1.0/invoke/{appId}/method/{methodName}`) is correct.
- The built-in Kubernetes secrets store name `"kubernetes"` used in the Go code is correct — Dapr automatically creates this component.
- Note that Dapr's API token authentication protects ALL Dapr API endpoints (not just specific routes), which is a broader scope than the per-endpoint middleware the original post implied. The revised post clarifies this.
