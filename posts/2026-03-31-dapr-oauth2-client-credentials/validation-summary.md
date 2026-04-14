# Validation Summary: How to Configure OAuth 2.0 Client Credentials Flow in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (middleware pipeline, service invocation)
- OAuth 2.0 Client Credentials Flow
- Kubernetes (secrets, annotations, deployments)
- Azure AD / Microsoft Entra ID (as example identity provider)

## Sources Consulted
- Dapr OAuth2 Client Credentials Middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2clientcredentials/
- Dapr OAuth2 (Authorization Code) Middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2/
- Dapr Bearer Middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr Configuration / Middleware Pipeline docs: https://docs.dapr.io/operations/components/middleware/
- Dapr Component Secrets Reference: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/

## Issues Found
1. **Incorrect middleware for token validation on the receiving service**: The post used `middleware.http.oauth2` as a "validator middleware" for incoming Bearer tokens from the client credentials flow. However, `middleware.http.oauth2` is the **Authorization Code flow** middleware — it initiates user-interactive OAuth2 flows with browser redirects (`authURL`, `redirectURL`), and is not designed to validate machine-to-machine Bearer tokens. The correct middleware for validating JWT/Bearer tokens on the receiving end is `middleware.http.bearer`, which checks the `issuer` and `audience` claims against the identity provider's public keys (fetched via OIDC discovery). Replaced the entire component definition with the correct `middleware.http.bearer` configuration using `audience` and `issuer` metadata fields.

## Review Notes
- The `headerName` value in the client credentials component uses `"Authorization"` (capitalized), while the official Dapr docs example uses `"authorization"` (lowercase). Both work since HTTP headers are case-insensitive per RFC 7230, so this is not an error.
- The `secretKeyRef` syntax for referencing Kubernetes secrets is correct and follows Dapr's documented pattern.
- The service invocation URL format (`/v1.0/invoke/{appId}/method/{methodName}`) is correct.
- The `httpPipeline` configuration and Kubernetes annotation patterns are correct per Dapr docs.
