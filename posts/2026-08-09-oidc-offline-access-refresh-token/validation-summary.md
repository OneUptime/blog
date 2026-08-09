# Validation Summary: Why `offline_access` Does Not Always Return an OIDC Refresh Token

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- OpenID Connect 1.0
- OAuth 2.0
- OAuth 2.0 Security Best Current Practice
- Refresh tokens and the `offline_access` scope
- Authorization Code Flow and PKCE
- OpenID Provider Discovery metadata
- HTTP/1.1 authorization and token requests
- Bash, curl, jq, and JavaScript

## Sources Consulted

- [OpenID Connect Core 1.0 incorporating errata set 2: Authorization Code Flow, Authentication Request, Offline Access, and Using Refresh Tokens](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect Discovery 1.0 incorporating errata set 2: Provider Metadata and Configuration Validation](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html), especially Sections 1.5, 3.2.1, 3.3, 4.1.3–4.1.4, 5.1–5.2, 6, and 10.4
- [RFC 7636: Proof Key for Code Exchange by OAuth Public Clients](https://www.rfc-editor.org/rfc/rfc7636.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html), especially Sections 2.1.1, 2.2.2, and 4.14
- [RFC 9112: HTTP/1.1, Section 3 — Request Line](https://www.rfc-editor.org/rfc/rfc9112.html#section-3)
- [curl command-line tool manual](https://curl.se/docs/manpage.html), including `--fail`, `--fail-with-body`, and `--data-urlencode`
- [jq 1.6 Manual](https://jqlang.org/manual/v1.6/), including object construction and `has`
- [Google OpenID Connect documentation: refresh tokens and re-consent](https://developers.google.com/identity/openid-connect/openid-connect#refresh-tokens)

## Issues Found

- The authorization request example split the HTTP request target across physical lines, which is not valid HTTP/1.1 wire syntax. The query parameters and protocol version are now on one request line as required by RFC 9112.
- The security-policy paragraph described client binding, refresh-token rotation, and sender-constraining as optional peer choices. It now states the normative requirements: issued refresh tokens remain bound to the client, and public-client refresh tokens must be sender-constrained or use rotation.
- The JavaScript branch for an issued refresh token stored the credential but did not create the renewable session. It now uses an application-defined atomic helper that persists the access-token state and encrypted refresh token together with `renewable: true`.
- Both curl-to-jq pipelines could hide curl's nonzero status because Bash normally reports the last pipeline command's status. Each Bash example now enables `pipefail` so discovery or token-endpoint failures propagate while diagnostic output remains visible.

## Review Notes

- The core explanation of `offline_access`, consent, code-returning response types, optional refresh-token issuance, discovery metadata defaults, scope reporting, refresh-token replacement, and `invalid_grant` behavior matches the cited specifications.
- The curl options are current and correctly used. The stated curl 7.76.0 minimum for `--fail-with-body` is accurate, and the jq filters work with jq 1.6.
- All documentation links and fragment targets were reachable during review. The author link redirects to the canonical GitHub profile.
- The request includes a `nonce`; the client or OIDC library must also verify the returned ID Token's `nonce` claim. The post's session-binding guidance is compatible with that requirement, but the comparison is not shown explicitly.
- The JavaScript helpers are intentionally application-defined pseudocode and must be implemented with the stated encrypted, atomic persistence semantics.
