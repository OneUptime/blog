# Validation Summary: How to Implement OIDC Logout When the App Session and Identity-Provider Session Disagree

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered

- OpenID Connect and OAuth 2.0
- OIDC RP-Initiated Logout
- OIDC Front-Channel Logout
- OIDC Back-Channel Logout
- OIDC Session Management
- OAuth 2.0 Token Revocation (RFC 7009)
- Node.js and Express-style JavaScript
- HTTP cookies, CSRF protection, and session invalidation

## Sources Consulted

- [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
- [OpenID Connect Back-Channel Logout 1.0 incorporating errata set 1](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [OpenID Connect Front-Channel Logout 1.0](https://openid.net/specs/openid-connect-frontchannel-1_0.html)
- [OpenID Connect Session Management 1.0](https://openid.net/specs/openid-connect-session-1_0.html)
- [RFC 7009 — OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [Express.js 5.x Response API](https://expressjs.com/en/5x/api/response/)
- [Node.js `crypto.randomBytes()` documentation](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback)
- [Node.js Buffer encodings](https://nodejs.org/api/buffer.html#buffers-and-character-encodings)
- [MDN `Set-Cookie` reference and cookie prefixes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#cookie_prefixes)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Issues Found

- The post stated categorically that all token expirations are independent of both sessions. OIDC Core makes that explicit only for ID-token expiration; providers can align other token lifetimes with session policy. The text now says token lifetimes need not coincide with the application or OP session.
- The `client_id` description was too narrow, and the pseudocode could request a post-logout redirect without an ID-token hint or another stated way for the OP to associate the redirect URI with a client. The description now reflects the parameter's common no-hint use, and the skeleton retains and sends the configured client ID.
- The confirmation language understated normative RP-Initiated Logout requirements. The post now says the OP should generally request confirmation and must do so when `id_token_hint` is absent or does not identify the current OP/RP/user session.
- The post said the OP must reject an unregistered post-logout target, which could imply that provider logout itself must be rejected. It now states the exact requirement: the OP must not redirect to a URI that does not exactly match a registered value.
- The example cookie name, `__Host_app_session`, did not use the exact protected `__Host-` prefix. Both uses now read `__Host-app_session`, with bracket property access where JavaScript syntax requires it; the existing `Secure`, `Path=/`, and omitted `Domain` settings satisfy the prefix constraints. The lookup also avoids querying the session store when the cookie is missing, preserving idempotent missing-session behavior.
- The pseudocode called Node's `crypto.randomBytes()` without showing a Node crypto binding. It now imports `randomBytes` from `node:crypto` and calls the imported function. The existing `base64url` Buffer encoding is current and non-deprecated.
- Back-channel logout was described as requiring an "authenticated endpoint," although the protocol authenticates the request through validation of the signed logout token rather than a separate HTTP endpoint-authentication scheme. The text now requires a reachable endpoint that validates the token.
- The post broadly said all mechanisms must be advertised and registered. That is not true for every deployment or for Session Management, which uses `check_session_iframe` and `session_state` rather than an RP logout URI. The wording now requires mutual support and configuration, and the earlier notification guidance says to configure and implement the chosen mechanism.
- RFC 7009 token revocation was described as necessarily server-to-server. RFC 7009 defines an HTTPS POST from the OAuth client to the authorization server and permits cross-origin support for user-agent-based clients. The text now uses the protocol-accurate description.

## Review Notes

- The JavaScript is intentionally Express-style pseudocode and assumes an initialized Express application, cookie-parsing middleware, session and logout-transaction stores, and validated OIDC configuration stored with the session.
- The corrected APIs are current for Express 5 and supported Node.js releases. Node introduced the `base64url` Buffer encoding in v14.18.0/v15.7.0; Express 5 requires Node.js 18 or newer.
- The official Back-Channel Logout page currently incorporates errata set 1, and the official OIDC Core page incorporates errata set 2. The post's specification links resolve to the current official documents.
