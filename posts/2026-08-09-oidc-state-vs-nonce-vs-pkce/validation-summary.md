# Validation Summary: OIDC State vs Nonce vs PKCE: Which Attack Does Each One Prevent?

## Status
validated

## Post Type
Technical security guide and reference

## Technologies Covered
- OpenID Connect 1.0
- OAuth 2.0 Authorization Code Grant
- OAuth 2.0 Security Best Current Practice
- Proof Key for Code Exchange (PKCE)
- JSON Web Tokens and ID token validation
- CSRF, authorization-code injection, and authorization-server mix-up defenses
- Node.js Crypto and Buffer APIs

## Sources Consulted
- OpenID Connect Core 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-discovery-1_0.html
- RFC 9700, Best Current Practice for OAuth 2.0 Security: https://www.rfc-editor.org/rfc/rfc9700.html
- RFC 6749, The OAuth 2.0 Authorization Framework: https://www.rfc-editor.org/rfc/rfc6749.html
- RFC 7636, Proof Key for Code Exchange by OAuth Public Clients: https://www.rfc-editor.org/rfc/rfc7636.html
- RFC 8414, OAuth 2.0 Authorization Server Metadata: https://www.rfc-editor.org/rfc/rfc8414.html
- RFC 9207, OAuth 2.0 Authorization Server Issuer Identification: https://www.rfc-editor.org/rfc/rfc9207.html
- RFC 8725, JSON Web Token Best Current Practices: https://www.rfc-editor.org/rfc/rfc8725.html
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Node.js Buffer encodings documentation: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html#built-in-modules

## Issues Found
- The comparison table described `state` as preventing “swapped callback responses,” which could imply that `state` prevents replacement of the authorization code inside an otherwise valid transaction. I changed this to callbacks not correlated with the initiating browser transaction; PKCE or, with its required precautions, OIDC `nonce` addresses authorization-code injection.
- The authorization-code-injection explanation assigned the mismatching nonce to the attacker and victim in a scenario-specific way that is reversed in RFC 9700's documented injection scenario. I rewrote it neutrally: the ID token carries the nonce from the transaction in which the injected code was issued, not the nonce stored for the current browser transaction.
- The ID token checklist presented authorized-party validation as unconditional and did not mention the required subject claim. I changed it to an explicitly non-exhaustive validation list that includes `sub` and treats `azp` requirements as conditional on the applicable profile or extension.
- The PKCE section said RFC 9700 recommends downgrade protections. RFC 9700 requires authorization servers to mitigate PKCE downgrade attacks, so I corrected the requirement level.
- The callback order did not perform the multi-issuer mix-up defense before code redemption. I added authorization-response issuer validation, or verification of an issuer-specific redirect URI, before error handling and token exchange, and clarified the later mix-up guidance. Validating only the ID token returned by the token endpoint is too late to prevent a code from being sent to an attacker's token endpoint.
- The negative PKCE test described `invalid_grant` as an example response. RFC 7636 requires `invalid_grant` when the verifier does not match, so I made the expected error exact.

## Review Notes
- The Node.js value-generation example was executed successfully with Node.js 24.1.0. It generated a 43-character verifier and a 43-character S256 challenge using the RFC 7636-compatible base64url alphabet.
- Node.js introduced the `base64url` encoding in versions 14.18.0 and 15.7.0. The example is current and uses no deprecated APIs; maintained Node.js releases support it.
- The transaction-store and OIDC-client method names are intentionally illustrative. A production implementation should continue to use a maintained library's complete callback validation API.
- All external documentation links in the post resolved to the intended official specifications.
