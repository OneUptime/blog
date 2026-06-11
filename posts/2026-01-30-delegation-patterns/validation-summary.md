# Validation Summary: How to Create Delegation Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OAuth 2.0 Authorization Code grant
- OAuth 2.0 Client Credentials grant
- OAuth 2.0 Token Exchange
- OAuth 2.0 Bearer token usage
- Node.js JavaScript
- Express-style middleware
- Mermaid diagrams

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework, https://datatracker.ietf.org/doc/html/rfc6749
- RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage, https://datatracker.ietf.org/doc/html/rfc6750
- RFC 8693: OAuth 2.0 Token Exchange, https://datatracker.ietf.org/doc/html/rfc8693
- Node.js documentation for global Fetch and URLSearchParams, https://nodejs.org/api/globals.html and https://nodejs.org/api/url.html

## Issues Found
- The client-credentials example did not check whether the token endpoint returned an error before reading the JSON body. Added a `response.ok` check so token request failures are surfaced cleanly.
- The on-behalf-of example accepted any non-empty `Authorization` header as a token if it did not exactly match the expected replacement pattern. Updated it to require the `Bearer ` scheme before extracting the token.
- The insufficient-scope middleware returned a 403 JSON body but did not set the OAuth Bearer `WWW-Authenticate` header. Added the header with `error="insufficient_scope"` and the required scope value, matching RFC 6750 guidance.

## Review Notes
The Authorization Code example is technically valid for a confidential backend client. For new public-client or mobile implementations, PKCE should be used, as the post already notes in the selection table.
