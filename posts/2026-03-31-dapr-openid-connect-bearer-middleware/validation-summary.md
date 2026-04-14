# Validation Summary: How to Use OpenID Connect Bearer Middleware in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (middleware HTTP pipeline)
- OpenID Connect (OIDC) bearer token validation
- JWT (JSON Web Tokens)
- Python / Flask
- Kubernetes (Dapr sidecar annotations)
- Google Identity Platform / Azure AD (Entra ID)

## Sources Consulted
- Dapr Bearer Middleware official docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr bearer middleware source code: https://github.com/dapr/components-contrib/blob/master/middleware/http/bearer/bearer_middleware.go
- Dapr bearer middleware metadata: https://github.com/dapr/components-contrib/blob/master/middleware/http/bearer/metadata.go
- Dapr components-contrib issue #187 (original feature request)

## Issues Found
1. **Fabricated `X-User-Sub` header in application code example (line 88)**: The post claimed that Dapr forwards decoded JWT claims as an `X-User-Sub` HTTP header to the application. This is incorrect — the Dapr bearer middleware strictly validates the token and either rejects the request with a 401 or passes it through unchanged. It does not inject any headers with decoded claims. **Fix**: Replaced the application code example to show how to decode the JWT payload from the `Authorization` header directly, since the token signature has already been verified by Dapr. Added a brief explanation that claim extraction requires parsing the JWT.

## Review Notes
- The component type (`middleware.http.bearer`), apiVersion (`dapr.io/v1alpha1`), version (`v1`), and metadata fields (`issuer`, `audience`) are all correct per official documentation.
- The `httpPipeline` Configuration resource format is correct.
- The `dapr run` CLI command and flags are correct.
- The Kubernetes Deployment annotations are correct.
- The Azure AD token endpoint URL and OAuth2 client credentials flow in the testing section are correctly structured.
- The optional `jwksURL` metadata field is not mentioned; this is acceptable since the middleware auto-discovers JWKS from the issuer's `.well-known/openid-configuration` endpoint when omitted.
