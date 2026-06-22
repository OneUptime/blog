# Validation Summary: How to Fix 'Temporarily Unavailable' OAuth2 Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OAuth 2.0
- OAuth 2.0 authorization endpoint and token endpoint errors
- HTTP 503, 502, 504, and 429 retry handling
- HTTP `Retry-After` header
- JavaScript Fetch API
- JavaScript retry logic with exponential backoff and jitter
- Mermaid diagrams

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework - https://datatracker.ietf.org/doc/html/rfc6749
- RFC 7231: Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content, `Retry-After` - https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.3
- WHATWG Fetch Standard - https://fetch.spec.whatwg.org/
- MDN Web Docs: `Window.fetch()` - https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch

## Issues Found
- The post showed `temporarily_unavailable` as a standard JSON error response. RFC 6749 defines this error for authorization endpoint redirect responses because a 503 cannot be returned through a browser redirect. I changed the example to an HTTP 302 redirect with the OAuth error parameters and clarified that token endpoint handling is commonly represented with HTTP 503 plus `Retry-After` and sometimes provider-specific JSON.
- The maintenance example used a non-standard `retry_after` JSON field as if it were the retry hint. I changed it to show the standard HTTP `Retry-After` header and moved the JSON error fields into a response body object.
- The retry handler parsed `Retry-After` only as integer seconds. RFC 7231 allows either delay seconds or an HTTP-date, so I added `parseRetryAfter()` and updated the retry logic to handle both formats.
- The multi-region fallback example could imply exchanging an authorization code with an unrelated OAuth server. I clarified that fallback regions must be compatible endpoints for the same OAuth issuer and must share client registration, issuer metadata, and authorization code state.

## Review Notes
- Verified all JavaScript code fences with `node --check`; all six JavaScript snippets parse successfully.
- The sample `oauth.exchangeCodeForToken()` API remains illustrative and depends on the caller's OAuth client library.
