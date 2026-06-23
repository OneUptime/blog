# Validation Summary: How to Implement OAuth2 Authorization in gRPC

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation walkthrough with code)

## Technologies Covered
- gRPC (Go and Python)
- OAuth2 (Client Credentials flow, Authorization Code + PKCE)
- RFC 7662 Token Introspection
- Scope-based authorization via gRPC interceptors (unary and stream)
- `google.golang.org/grpc` `PerRPCCredentials` / `AuthMetadataPlugin`
- `github.com/golang-jwt/jwt/v5`
- `gopkg.in/square/go-jose.v2` (JWKS)
- Identity providers: Keycloak, Auth0, Okta

## Sources Consulted
- golang-jwt v5 docs & migration guide (v4 → v5): https://github.com/golang-jwt/jwt and https://golang-jwt.github.io/jwt/usage/parse/ — `WithAudience`, `WithIssuer` parser options; removal of `VerifyAudience`/`VerifyIssuer` methods
- gRPC Go `credentials.PerRPCCredentials` interface: https://pkg.go.dev/google.golang.org/grpc/credentials#PerRPCCredentials
- gRPC Python `grpc.AuthMetadataPlugin` / `grpc.ServerInterceptor`: https://grpc.github.io/grpc/python/grpc.html
- RFC 7662 (OAuth 2.0 Token Introspection): https://www.rfc-editor.org/rfc/rfc7662
- RFC 6749 (OAuth 2.0 Authorization Framework) and RFC 7636 (PKCE)
- Keycloak OpenID Connect endpoints: https://www.keycloak.org/docs/latest/securing_apps/ (`/realms/{realm}/protocol/openid-connect/token` and `/token/introspect`)
- Okta OAuth 2.0 endpoints: https://developer.okta.com/docs/reference/api/oidc/ (`/oauth2/default/v1/token`, `/v1/introspect`, `/v1/keys`)
- Auth0 JWKS / token validation: https://auth0.com/docs/secure/tokens/json-web-tokens

## Issues Found
- **Auth0 `ValidateToken` used removed jwt v4 API under a v5 import (compile error).** The code imported `github.com/golang-jwt/jwt/v5` but called `claims.VerifyAudience(v.config.Audience, true)` and `claims.VerifyIssuer(expectedIssuer, true)`. These helper methods existed on the claims types in golang-jwt **v4** but were **removed in v5**, so the snippet would not compile. Fixed by validating audience and issuer through the v5 parser options `jwt.WithAudience(...)` and `jwt.WithIssuer(...)` passed to `jwt.ParseWithClaims`, and removing the now-invalid manual `Verify*` block. This is also functionally better because the checks run during parsing.

## Review Notes
- **Deprecated-but-functional APIs (left as-is; still compile and run):**
  - `grpc.Dial` in the client example is deprecated in recent grpc-go (≥ 1.63) in favor of `grpc.NewClient`. Still works.
  - `ioutil.ReadAll` (Go 1.16+) is deprecated in favor of `io.ReadAll`. Still works.
  - `gopkg.in/square/go-jose.v2` is the archived square module; the maintained successor is `github.com/go-jose/go-jose`. The v2 import still resolves and the JWKS API used (`jose.JSONWebKeySet`, `.Key(kid)`) is valid.
- The flows comparison table, the introspection caching logic (capping cache expiry to the token's `exp`), and the per-method scope map are all technically accurate.
- The Python development example intentionally returns an insecure channel; the secure (TLS + composite credentials) path is shown in comments, which is reasonable for a tutorial.
- Minor design note (not an error): introspecting the bearer token on every request adds an auth-server round trip; the caching layer mitigates this, and Auth0's local JWT validation path is offered as an alternative — both are appropriate.
