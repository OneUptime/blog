# Validation Summary: How to Handle IPv6 in OAuth2 Redirect URIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OAuth2 / OpenID Connect
- IPv6 addressing in URIs (RFC 3986)
- Keycloak Admin REST API
- Auth0 Application configuration
- Node.js (`openid-client` library, Express)
- Python (`Authlib` Flask client)

## Sources Consulted
- RFC 3986 — Uniform Resource Identifier (URI): Generic Syntax (https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2)
- RFC 5952 — A Recommendation for IPv6 Address Text Representation
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- Keycloak Admin REST API documentation — ClientRepresentation (`redirectUris`, `webOrigins`)
- Auth0 Management API — Clients endpoint
- `openid-client` (Node.js) v5.x API — `Issuer.discover`, `new issuer.Client`
- Authlib Flask integration documentation — `OAuth.register`, `authorize_redirect`, `authorize_access_token`
- Express.js docs — `app.listen(port, host, callback)` and `req.socket.localAddress`
- Flask docs — `app.run(host='::')` for IPv6 binding

## Issues Found
- **Invalid IPv6 address `2001:db8:auth::1`**: IPv6 hextets must only contain hexadecimal characters (0–9, a–f). The string "auth" contains the non-hex characters `u`, `t`, and `h`, making this an invalid IPv6 literal. Replaced with the valid documentation address `2001:db8::1` (RFC 3849) in three places: the Node.js `Issuer.discover` URL, and both `access_token_url`/`authorize_url` in the Python Authlib example.

## Review Notes
- The `openid-client` example uses the v5.x API (`Issuer.discover`, `new issuer.Client(...)`). The library released a redesigned v6 API in late 2024 with a different functional shape (`discovery()` etc.). The v5 API is still functional, but readers using the latest major version may need to adapt.
- The Auth0 JSON snippet uses dashboard-style field names (`allowed_callback_urls`, `allowed_origins`). The actual Auth0 Management API uses `callbacks` and `allowed_origins`. The comment indicates this represents Dashboard settings, so the snippet is illustrative rather than a literal API payload — acceptable in context.
- Examples use `[::1]` (IPv6 loopback) and the documentation prefix `2001:db8::/32`, which is correct practice for examples per RFC 3849.
- The bracket-around-IPv6 rule and the ambiguity demo (`http://::1:3000/callback` being unparseable) accurately reflect RFC 3986 §3.2.2.
