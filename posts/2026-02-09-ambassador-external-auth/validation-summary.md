# Validation Summary: How to Use Ambassador External Auth Service for Custom Authentication Logic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Emissary-ingress / Ambassador API Gateway AuthService
- Kubernetes Deployments, Services, readiness probes, and liveness probes
- Go HTTP services
- Docker
- JWT validation with `github.com/golang-jwt/jwt/v5`
- OAuth2 authorization redirects
- API key authentication
- Redis caching with Go
- Prometheus Go client instrumentation

## Sources Consulted
- Emissary-ingress AuthService documentation: https://emissary-ingress.dev/docs/3.10/topics/running/services/auth-service/
- Emissary-ingress AuthService per-Mapping settings: https://emissary-ingress.dev/docs/3.7/topics/using/authservice/
- Emissary-ingress quick start service naming: https://emissary-ingress.dev/docs/3.10/quick-start/
- Envoy external authorization HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter.html
- Envoy external authorization HTTP service API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto.html
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- `github.com/golang-jwt/jwt/v5` package documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- Redis Go client documentation: https://redis.io/docs/latest/develop/clients/go/connect/

## Issues Found
- The post described the feature as Ambassador AuthService, but the current `AuthService` CRD is documented for Emissary-ingress, while Ambassador Edge Stack uses External Filters instead. I changed the body text and description to refer to Emissary-ingress while leaving the existing title and tag intact.
- The Go auth service registered only `/auth`, but `path_prefix: /auth` causes auth requests to include the prefixed request path. I added a `/auth/` handler and changed authorization path extraction to use the request URL instead of a non-standard `X-Original-URI` header.
- The Kubernetes probes targeted `/health`, but the Go service did not expose `/health`. I added a simple health endpoint.
- The Go handler set `Content-Type` after `WriteHeader` in the missing-auth branch. I moved the header write before the status code.
- The AuthService configuration included `X-Original-URI`, which Emissary does not add automatically through `allowed_request_headers`. I removed it and allowed `X-API-Key` so the later API key example can work with the same AuthService.
- The post showed invalid global and per-mapping AuthService configuration using `Module config.auth_service` and `Mapping spec.auth_service`. Current Emissary AuthService configuration is global unless a Mapping uses `bypass_auth`, so I replaced those snippets with a normal protected Mapping and a public Mapping using `bypass_auth: true`.
- The JWT snippet used `fmt.Errorf` without importing `fmt`, referenced an undefined `interfaceToStringSlice`, and used unchecked claim type assertions that could panic on malformed tokens. I added the import, helper, and checked assertions.
- The OAuth2 redirect snippet built a query string with raw values and left `originalURL` unused. I changed it to use `url.Values` and pass the original URL into state generation.
- The Redis caching snippet used the older `github.com/go-redis/redis/v8` import path. Current official Redis Go client documentation uses `github.com/redis/go-redis/v9`, so I updated the import path and client construction.
- The test command used the older `ambassador` service in the `ambassador` namespace and only read a load balancer IP. I updated it to the current Emissary quick start service name and a template that handles either IP or hostname.

## Review Notes
- The main Go service snippet was reviewed manually, but this environment does not have the `go` binary installed, so I could not run a local compile check.
- YAML snippets were reviewed against official CRD field documentation, but this environment does not have a YAML parser such as Ruby available for local syntax validation.
- The article still uses "Ambassador" in the title and tag for discoverability, but the implementation content now reflects the current Emissary-ingress AuthService resource model.
