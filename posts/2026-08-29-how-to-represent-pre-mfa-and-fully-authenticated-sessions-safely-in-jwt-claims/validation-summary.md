# Validation Summary: How to Represent Pre-MFA and Fully Authenticated Sessions Safely in JWT Claims

## Status
validated

## Post Type
Technical security guide

## Technologies Covered

- JSON Web Tokens (JWT), JSON Object Signing and Encryption (JOSE), and JSON Web Signatures (JWS)
- Multi-factor authentication (MFA) and pre-authentication transactions
- OpenID Connect claims: `acr`, `amr`, and `auth_time`
- OAuth 2.0 step-up authentication and refresh-token rotation
- Session rotation, replay prevention, revocation, and token-type isolation

## Sources Consulted

- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html), especially registered claims, JOSE headers, validation, trust decisions, and privacy considerations
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html), especially algorithm verification, issuer/key binding, audience validation, explicit typing, and mutually exclusive validation rules
- [RFC 8176: Authentication Method Reference Values](https://www.rfc-editor.org/rfc/rfc8176.html), including the `pwd` and `otp` values and the distinction between `amr` and `acr`
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html#IDToken), for `auth_time`, `acr`, and `amr` semantics
- [RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol](https://www.rfc-editor.org/rfc/rfc9470.html), for `acr_values`, `max_age`, and validation of the resulting authentication context
- [RFC 9068: JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html), for JWT access-token typing and authentication-context claims
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html), for refresh-token protection and rotation
- [IANA JOSE Registry](https://www.iana.org/assignments/jose/), to confirm the current registration and implementation status of `ES256`
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html), for disclosure, key lookup, revocation, and replay guidance
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), for renewing the session identifier after an authentication or privilege-level change

## Issues Found

- The statement that JWTs are immutable was too broad. It was changed to state that a signed JWT cannot be modified without invalidating its signature.
- The statement that a signature provides issuer authentication omitted the required trust relationship between the verification key and expected issuer. It was changed to make that key binding explicit and to say that the signature authenticates the signer.
- The validation checklist treated `nbf` as universally required even though RFC 7519 makes it optional. It now says to validate any present or profile-required not-before claim.
- The OAuth step-up paragraph called the RFC 9470 challenge parameter `acr` and implied a universal strength ordering. It now uses the actual `acr_values` parameter, describes `max_age` in terms of recent active authentication, and requires the resource server to verify the resulting token's context and time.

## Review Notes

All three JSON snippets are syntactically valid. Their NumericDate values are coherent, `ES256` remains a current recommended JOSE algorithm, `pwd` and `otp` are registered RFC 8176 values, and `urn:example:aal:2` is suitable as a documentation-only example `acr` URI. The fully authenticated token is presented as an application-defined session or access token; if it were claimed to conform specifically to RFC 9068, it would also need the profile's protected `typ` value and required claims such as `client_id`. One-use transaction consumption should be implemented atomically to prevent concurrent replay.
