# Validation Summary: How to Configure OAuth2 with Okta

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OAuth 2.0
- OpenID Connect
- Okta
- Authorization Code Flow with PKCE
- Client Credentials Flow
- JSON Web Tokens
- JWKS
- JavaScript
- Node.js / Express middleware

## Sources Consulted
- Okta Developer: Authorization Code with PKCE, https://developer.okta.com/docs/guides/implement-grant-type/authcodepkce/main/
- Okta Developer: Client Credentials grant, https://developer.okta.com/docs/guides/implement-grant-type/clientcreds/main/
- Okta Developer: Validate Access Tokens, https://developer.okta.com/docs/guides/validate-access-tokens/dotnet/main/
- Okta Developer: Validate ID Tokens, https://developer.okta.com/docs/guides/validate-id-tokens/main/
- Okta Developer: Authorization servers, https://developer.okta.com/docs/concepts/auth-servers/
- Okta Developer: Refresh access tokens and rotate refresh tokens, https://developer.okta.com/docs/guides/refresh-tokens/main/
- RFC 7636: Proof Key for Code Exchange by OAuth Public Clients, https://www.rfc-editor.org/rfc/rfc7636
- RFC 7519: JSON Web Token, https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The architecture diagram showed the SPA sending the authorization code and PKCE verifier to the backend for token exchange, while the implementation exchanges the code directly with Okta from the SPA. Updated the diagram to match Okta's Authorization Code with PKCE flow for public clients.
- The server-side application setup advised enabling Client Credentials broadly for server-side applications. Okta documents Client Credentials as a no-end-user, machine-to-machine flow using API Services/custom scopes, so the post now clarifies that server-side user sign-in should use Authorization Code and that Client Credentials is only for machine-to-machine applications.
- The JWT decoding helper used `atob(parts[1])` directly. JWT payloads are base64url encoded and may require URL-safe character conversion and padding before browser decoding, so the helper now normalizes base64url input and decodes via `TextDecoder`.
- The summary incorrectly stated that server-side applications should use client credentials. Updated it to distinguish server-side user sign-in from machine-to-machine applications.

## Review Notes
The access-token validation example follows the expected pattern of using Okta's JWKS endpoint, RS256, issuer validation, and an API audience. For production, prefer Okta-supported SDKs or a mature OAuth/OIDC library where possible, and validate all relevant token claims for the specific authorization server and resource server.
