# Validation Summary: How to Require Step-Up MFA Only for Sensitive Actions and APIs

## Status

validated

## Post Type

Technical security guide

## Technologies Covered

- Step-up multi-factor authentication (MFA)
- OAuth 2.0 protected APIs and RFC 9470 authentication challenges
- OpenID Connect authentication-context claims (`acr`, `amr`, and `auth_time`)
- JWT access-token validation and token introspection
- HTTP/1.1 `WWW-Authenticate` response fields
- NIST authentication assurance, session management, and reauthentication
- Server-side authorization and transaction-bound approval
- One-time grants, replay prevention, and idempotent API operations

## Sources Consulted

- [RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol](https://www.rfc-editor.org/rfc/rfc9470.html)
- [RFC 9112, Section 5.2: Obsolete Line Folding](https://www.rfc-editor.org/rfc/rfc9112.html#section-5.2)
- [OpenID Connect Core 1.0, Section 2: ID Token claims](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [OpenID Connect Back-Channel Logout 1.0, Section 2.1: `sid` claim](https://openid.net/specs/openid-connect-backchannel-1_0-final.html#rfc.section.2.1)
- [RFC 8176: Authentication Method Reference Values](https://www.rfc-editor.org/rfc/rfc8176.html)
- [RFC 9068: JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html)
- [NIST SP 800-63B-4: Session Management and Reauthentication](https://pages.nist.gov/800-63-4/sp800-63b/session/#sessionreauthn)
- [NIST SP 800-63B-4: Authentication Assurance Levels](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

## Issues Found

- The HTTP/1.1 example split the `WWW-Authenticate` field across two physical lines. Read literally, that used obsolete line folding (`obs-fold`), which RFC 9112 Section 5.2 prohibits senders from generating outside the `message/http` media type. The field was changed to one line; its RFC 9470 error and challenge parameters are otherwise unchanged.

## Review Notes

- The RFC 9470 use of `401 Unauthorized`, `insufficient_user_authentication`, `acr_values`, and quoted `max_age` is correct. Both requirement parameters may appear in the same challenge, and the resource server must evaluate the returned access token rather than assume the authorization server satisfied the request.
- The `acr`, `amr`, and `auth_time` explanations and example values are correct. RFC 9068 and RFC 9470 confirm that authentication context and time remain tied to the authentication event across refresh-derived access tokens unless a new authentication event occurs.
- The authentication-context object is explicitly illustrative rather than a complete token. For OAuth APIs, such context must be conveyed through a validated access token or token introspection; an OpenID Connect ID token must not be accepted as an API access token. If `sid` is carried in an access token, its meaning and validation need an agreed profile or trusted server-side mapping.
- The phrase "fixed algorithm" is safe when it means a verifier-configured algorithm. RFC 8725 more generally permits a configured supported set and requires cryptographic agility; implementations must never select an algorithm solely from an untrusted token header.
- The short-lived, one-use, transaction-bound authorization guidance matches OWASP's transaction-authorization principles. NIST and OWASP also support server-side reauthentication decisions for sensitive actions and risk events.
- All referenced URLs resolved to the intended current specifications or guidance. No deprecated API, command, configuration, or version-specific issue was found.
