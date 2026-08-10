# Validation Summary: OIDC `aud` vs `azp`: How to Validate Tokens Issued to Multiple Clients

## Status

validated

## Post Type

Technical guide / reference

## Technologies Covered

- OpenID Connect Core 1.0 ID tokens
- OAuth 2.0 client identifiers
- JSON Web Tokens (JWTs)
- `aud`, `azp`, `iss`, and `client_id` claims
- RFC 9068 JWT access tokens
- JSON Web Keys (JWKs) and JWKS key selection
- JavaScript claim-validation logic

## Sources Consulted

- OpenID Connect Core 1.0 incorporating Errata Set 2, Section 2 (ID Token) — https://openid.net/specs/openid-connect-core-1_0.html#IDToken
- OpenID Connect Core 1.0 incorporating Errata Set 2, Section 3.1.3.7 (ID Token Validation) — https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation
- OpenID Connect Core 1.0 draft 36 (draft Errata Set 3), Section 3.1.3.7 — https://openid.net/specs/openid-connect-core-1_0-36.html#IDTokenValidation
- RFC 7519, Section 4.1.3 (`aud` claim syntax and comparison) — https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.3
- RFC 9068, Sections 2.1, 2.2, 4, and 5 (JWT access-token claims and validation) — https://www.rfc-editor.org/rfc/rfc9068.html
- RFC 8725, Sections 3.1 and 3.8–3.12 (JWT validation best practices) — https://www.rfc-editor.org/rfc/rfc8725.html
- RFC 6749, Section 2.2 (authorization-server scope of client identifiers) — https://www.rfc-editor.org/rfc/rfc6749.html#section-2.2
- RFC 7517, Section 4.5 (`kid` scope and key selection) — https://www.rfc-editor.org/rfc/rfc7517.html#section-4.5
- RFC 8693, Section 4.3 (`client_id` JWT claim) — https://www.rfc-editor.org/rfc/rfc8693.html#section-4.3
- OpenID iGov OAuth 2.0 Implementer's Draft 2, Section 3.3 (profile-specific access-token use of `azp`) — https://openid.net/specs/openid-igov-oauth2-1_0.html#section-3.3
- ECMAScript 2026 indexed and keyed collection methods — https://tc39.es/ecma262/2026/multipage/indexed-collections.html#sec-array.prototype.includes and https://tc39.es/ecma262/2026/multipage/keyed-collections.html#sec-set.prototype.has

## Issues Found

1. **The stricter `azp === client_id` policy was presented too much like the default OIDC Core behavior.** Current OIDC Core encourages implementations without an applicable extension to ignore `azp`; extension-produced `azp` is processed under that extension, and client-ID equality can instead be chosen as a stricter local policy. Clarified this distinction in the opening rules, policy guidance, helper disclaimer, common cases, and debugging checklist.
2. **“Presenter” was imprecise terminology for `azp`.** The claim identifies the authorized party/client to which the ID token was issued; it does not prove which party presented the token. Replaced “another presenter” with “another authorized party/client.”
3. **The signature-validation wording did not account clearly for HMAC-signed ID tokens.** “Issuer's keys” suggested only asymmetric issuer keys, while OIDC also permits MAC algorithms that use the client secret for the relevant issuer/client registration. Changed the wording to “verification material configured for that issuer and client registration.”
4. **The illustrative JavaScript helper did not explicitly validate every `aud` array member as a string.** A malformed non-string value could pass if it also appeared in the supplied trust set, contrary to JWT audience syntax. Added an explicit non-string rejection.
5. **The helper's trusted-audience parameter had a misleading contract.** It required callers to include the expected client ID in the trust set even though the surrounding text discussed trusted additional audiences. Renamed it to `trustedAdditionalAudiences` and excluded the already-validated client ID from the additional-audience check.
6. **The access-token `azp` statement was too narrowly limited to provider-specific behavior.** RFC 9068 standardizes `client_id`, not `azp`, but an access-token profile can also define or permit `azp`. Updated the text to describe such behavior as profile- or provider-specific and to direct readers to the governing access-token contract.

## Review Notes

- The post correctly states that an ID token's `aud` claim is required, can be a string or an array of strings, must contain the issuer-specific RP client ID, and must not contain additional audiences that the client does not trust.
- The post correctly avoids the obsolete simplification that every multi-audience ID token requires `azp`. Approved Errata Set 2 and the current draft Errata Set 3 both use extension-specific processing.
- The RFC 9068 distinction between ID-token audiences and access-token resource audiences is correct, as are the `at+jwt`, issuer, signature, expiration, and authorization-claim checks described for APIs.
- All JSON examples are valid. The revised JavaScript helper uses current ECMAScript APIs and passed positive and negative runtime tests, including malformed audience types, unknown audiences, case mismatches, and mismatched `azp` under its documented stricter local policy.
- All four links in the post's Sources section resolve successfully to the intended authoritative specifications.
- The post contains no terminal commands or configuration snippets requiring separate validation.
