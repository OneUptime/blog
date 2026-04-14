# Validation Summary: How to Use Dapr with OpenID Connect Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (middleware components, HTTP pipeline, service invocation API)
- OpenID Connect (OIDC)
- OAuth2 Client Credentials flow
- JWT Bearer Token validation
- Keycloak (OIDC provider, kcadm.sh CLI)
- Node.js (`jsonwebtoken`, `jwks-rsa` packages)

## Sources Consulted
- Dapr OAuth2 Client Credentials middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2clientcredentials/
- Dapr Bearer middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr Configuration overview (HTTP pipeline): https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Keycloak OIDC endpoint documentation: https://www.keycloak.org/securing-apps/oidc-layers

## Issues Found
1. **Misleading description of `middleware.http.oauth2clientcredentials`**: The section "Configuring OAuth2 Middleware" described this component as being for "OIDC token validation," but `oauth2clientcredentials` actually acquires tokens via the OAuth2 client credentials flow and attaches them to outgoing/forwarded requests (service-to-service auth). It does NOT validate incoming tokens. The `middleware.http.bearer` component (covered in the next section) is the one that validates incoming JWTs. Fixed the section heading and description to accurately reflect the middleware's purpose.

## Review Notes
- All Dapr component YAML snippets use correct `apiVersion`, `kind`, field names, and metadata keys matching official docs.
- The `middleware.http.bearer` metadata fields (`jwksURL`, `audience`, `issuer`) are all correct. `jwksURL` is optional (Dapr can auto-discover from issuer's `.well-known/openid-configuration`), but providing it explicitly is valid.
- The Keycloak JWKS endpoint format (`/realms/{realm}/protocol/openid-connect/certs`) is correct.
- The Dapr invoke URL format (`http://localhost:3500/v1.0/invoke/<appID>/method/<method>`) is correct, using the default HTTP port 3500.
- The Node.js JWT validation code correctly uses `jsonwebtoken` and `jwks-rsa` packages with proper API calls (`jwt.decode` with `{ complete: true }`, `getSigningKey`, `jwt.verify`).
- The `secretKeyRef` syntax for referencing Dapr secret stores is a valid general Dapr pattern.
