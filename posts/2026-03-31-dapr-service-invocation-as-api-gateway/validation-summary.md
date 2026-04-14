# Validation Summary: How to Use Dapr Service Invocation as API Gateway

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (service invocation, access control, middleware pipeline, tracing)
- Kubernetes (Ingress, nginx ingress controller)
- Go (reverse proxy for API token injection)
- OpenTelemetry (tracing configuration)
- Prometheus (metrics querying)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr API Token Authentication: https://docs.dapr.io/operations/security/api-token/
- Dapr Access Control Lists: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr HTTP Middleware - Bearer: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr HTTP Middleware - Router Alias: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-routeralias/
- Dapr HTTP Middleware - Rate Limit: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-ratelimit/
- Dapr Tracing Configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Kubernetes Ingress-Nginx Rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- Go `net/http/httputil` ReverseProxy documentation: https://pkg.go.dev/net/http/httputil#ReverseProxy

## Issues Found

### 1. Ingress rewrite target used wrong capture group references
- **What was wrong:** The nginx ingress rewrite target was `/v1.0/invoke/$2/method/$3`, but the path regex `/api/([\w-]+)/(.+)` only has two capture groups (`$1` = service name, `$2` = method path). `$3` does not exist and would resolve to an empty string, producing malformed Dapr invocation URLs.
- **What was changed:** Corrected rewrite target to `/v1.0/invoke/$1/method/$2`.
- **Why:** Nginx ingress capture groups are numbered `$1`, `$2`, etc. matching their order in the regex. The service name is `$1` and the method path is `$2`.

### 2. Ingress backend port did not match proxy listening port
- **What was wrong:** The Ingress backend service port was `3500` (the Dapr sidecar port), but the Go token-injection proxy listens on port `8080`. The intended architecture is Ingress -> proxy (8080) -> Dapr sidecar (3500), so the Ingress must target the proxy.
- **What was changed:** Changed Ingress backend port from `3500` to `8080`.
- **Why:** The proxy needs to intercept requests to inject the `dapr-api-token` header before forwarding to the Dapr sidecar. Pointing the Ingress directly at port 3500 would bypass the proxy entirely.

### 3. Middleware type `middleware.http.routeralias` mislabeled as "request-logger"
- **What was wrong:** The httpPipeline handler named `request-logger` used type `middleware.http.routeralias`. The `routeralias` middleware performs route path aliasing/transformation, not request logging. Dapr does not have a built-in HTTP middleware for request logging; request observability is handled by the tracing configuration (already present in the post).
- **What was changed:** Replaced with `name: rate-limiter` and `type: middleware.http.ratelimit`, which is a real Dapr middleware component and a more appropriate cross-cutting concern for an API gateway pattern.
- **Why:** The original pairing was technically incorrect -- the middleware type did not match its stated purpose. Rate limiting is a common and relevant API gateway concern that uses a real Dapr middleware component.

## Review Notes
- The Go proxy code does not handle the error from `url.Parse()` (line 60: `daprURL, _ := url.Parse(...)`). While this is unlikely to fail with a hardcoded URL, production code should handle this. This is a code quality observation, not a correctness issue.
- The `middleware.http.bearer` and `middleware.http.ratelimit` components would each need a corresponding Dapr Component resource with metadata (e.g., issuer, audience for bearer; max requests per second for rate limit). The post does not show these Component definitions, which readers would need to deploy this pattern. This is a completeness observation rather than a technical error.
- The `kubectl get configuration` command in the Caveats section works but the canonical documented form is `kubectl get configurations` (plural). Both forms are accepted by kubectl.
- The overall architectural pattern (Ingress -> token proxy -> Dapr sidecar for external service invocation) is sound and well-explained. The access control, tracing, and security configurations are all correctly structured per Dapr documentation.
