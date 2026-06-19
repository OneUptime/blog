# Validation Summary: How to Fix 'Expired Token' Errors in OAuth2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OAuth 2.0
- Bearer tokens
- Refresh tokens
- JavaScript / Node.js
- Python asyncio
- aiohttp
- JSON Web Tokens
- jsonwebtoken
- Mermaid diagrams

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework - https://datatracker.ietf.org/doc/html/rfc6749
- RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage - https://datatracker.ietf.org/doc/html/rfc6750
- auth0/node-jsonwebtoken documentation - https://github.com/auth0/node-jsonwebtoken
- aiohttp Client Reference - https://docs.aiohttp.org/en/stable/client_reference.html

## Issues Found
- The JavaScript token manager replaced the stored refresh token with `undefined` when a refresh response omitted `refresh_token`. RFC 6749 allows refresh responses to issue an optional new refresh token, so the implementation now keeps the existing refresh token when a new one is not returned.
- The JavaScript token manager assumed a 30-day refresh-token lifetime when the authorization server did not provide one. OAuth 2.0 does not define a standard `refresh_expires_in` parameter or default refresh-token lifetime, so the implementation now treats the expiry as unknown unless the server provides it.
- The Python token manager also discarded the existing refresh token when a refresh response omitted `refresh_token`. It now preserves the existing token unless a rotated token is returned.
- The Python `AuthenticatedSession` returned an `aiohttp.ClientResponse` from inside an `async with session.request(...)` block and from a session scoped to the request method, leaving callers with a closed response/session. It now keeps a reusable `ClientSession`, returns a live response, releases retry responses before refreshing, and exposes `close()`.
- The Python 401 handling assumed the error body was JSON. It now falls back to an empty body when the response is not JSON, which still allows detection through the `WWW-Authenticate` header.
- The error-handling flow diagram showed an expired or invalid refresh token as `401 invalid_grant`. RFC 6749 token endpoint errors are returned as token endpoint error responses, commonly `400 Bad Request` with `invalid_grant`, so the diagram now says `Auth Server: 400 invalid_grant`.

## Review Notes
- All JavaScript fenced code blocks were checked with `node --check`.
- All Python fenced code blocks were checked with `python3 -m py_compile`.
- The post uses `refresh_expires_in`, which is provider-specific rather than part of core OAuth 2.0. The examples handle it as an optional provider extension.
