# How to Represent Pre-MFA and Fully Authenticated Sessions Safely in JWT Claims

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JWT, MFA, Authentication, Session Management, API Security

Description: Separate pre-MFA and fully authenticated JWTs by type, audience, scope, lifetime, and validation rules while preserving method and freshness context.

---

After a password succeeds but before MFA completes, the user is identified but not fully authenticated for the application's normal policy. Representing that state with a normal access token plus `mfa=false` is dangerous: one forgotten check turns the intermediate token into an API credential.

Use a constrained pre-authentication transaction or token whose only authority is to complete MFA. Issue a separately typed normal session or access token only after the factor succeeds.

## Prefer Server State for the Intermediate Flow

A random opaque transaction ID backed by server state is easy to consume, revoke, throttle, and bind to one login. If architecture requires a JWT, give it a distinct media type, audience, key/validation policy where practical, and very short lifetime:

Protected header:

```json
{
  "typ": "preauth+jwt",
  "alg": "ES256",
  "kid": "current-signing-key"
}
```

Claims:

```json
{
  "iss": "https://id.example.com",
  "aud": "https://id.example.com/mfa/complete",
  "sub": "opaque-user-id",
  "jti": "random-one-use-id",
  "purpose": "complete_mfa",
  "iat": 1787990400,
  "exp": 1787990700
}
```

The JOSE `typ` value belongs in the protected header, not the claims object. Reject an unexpected or missing value according to the profile.

The MFA completion service should also check authoritative transaction state: password-authentication time, allowed factors, attempt budget, risk flags, session/browser binding, and whether `jti` was consumed. The token must not refresh itself, call user-data APIs, change factors, mint API keys, or be accepted by resource servers.

## Issue a New Token After MFA

JWTs are immutable. Do not “upgrade” client-side state or keep the same token after MFA. Consume the pre-authentication transaction, rotate the session identifier, and issue a new token with the normal resource audience and trusted authentication context:

```json
{
  "iss": "https://id.example.com",
  "sub": "opaque-user-id",
  "aud": "https://api.example.com",
  "exp": 1787991300,
  "iat": 1787990405,
  "jti": "new-random-id",
  "sid": "opaque-session-id",
  "acr": "urn:example:aal:2",
  "amr": ["pwd", "otp"],
  "auth_time": 1787990405,
  "security_epoch": 12
}
```

Define local `acr` values and map them to policy; do not assume a string is interoperable merely because it contains “aal2.” `amr` records authentication methods and RFC 8176 registers common values. It does not by itself prove that the combination satisfied a particular assurance level. `auth_time` is the time of active user authentication, not token refresh time.

Avoid a bare boolean. `mfa=true` cannot express phishing resistance, user verification, method restrictions, recovery use, or freshness. Downstream services should ask whether the trusted context meets the requirement for this action.

## Apply Mutually Exclusive Validation Rules

RFC 8725 recommends explicit typing and mutually exclusive validation rules for different JWT kinds. At every consumer:

- allow-list the expected signature algorithm; never derive it from untrusted input;
- validate signature, issuer, audience, expiry, not-before, and token type;
- bind issuer to its keys and reject untrusted key URLs or `kid` injection;
- use different audiences and preferably different keys for pre-auth and access tokens;
- reject claims that are missing, malformed, duplicated, or outside the local profile;
- keep ID tokens, access tokens, pre-auth tokens, password-reset tokens, and action grants non-substitutable.

A signature provides integrity and issuer authentication, not confidentiality. Never put TOTP secrets, OTPs, recovery codes, sensitive PII, or browser fingerprints into JWT claims. Anyone holding an ordinary signed JWT can generally decode its payload.

## Preserve Revocation and Freshness

Short JWT lifetimes reduce but do not eliminate the revocation gap. Check a live session record, security epoch, or token introspection for high-risk actions. Increment the epoch and revoke the `sid` after recovery, factor replacement, password reset, or suspected theft.

Refresh tokens are higher-value credentials. Store and rotate them through a server-tracked family; never issue one to a pre-MFA flow. Refreshing a fully authenticated token preserves the original `auth_time` unless the user actively reauthenticates.

For OAuth step-up, RFC 9470 lets a resource server request a stronger `acr` or a smaller `max_age`. Validate the new access token rather than assuming the authorization server honored the request.

## Threat Model and Failure Modes

Defend against missing authorization checks, token substitution, algorithm confusion, forged key lookup, stolen pre-auth tokens, replay, stale MFA claims, and secrets disclosed in payloads. Common failures include sharing one audience for all token types, issuing refresh tokens before MFA, accepting `mfa` from the client, setting `auth_time` on refresh, and trusting `amr` without a defined policy mapping.

## Rollout and Test Checklist

- Prefer an opaque server-side transaction for pre-MFA state.
- If using JWT, isolate it by protected type, audience, lifetime, and validation rules.
- Permit pre-auth authority only at the MFA completion endpoint.
- Consume its `jti` once and issue a new token/session after factor success.
- Define `acr`, `amr`, `auth_time`, `sid`, and security-epoch semantics.
- Validate fixed algorithm, issuer/key binding, audience, type, and time claims.
- Keep token kinds mutually exclusive and never put secrets in payloads.
- Test substitution of every token kind at every security boundary.

## References

- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725: JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [RFC 8176: Authentication Method Reference Values](https://datatracker.ietf.org/doc/html/rfc8176)
- [OpenID Connect Core: ID Token Claims](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol](https://datatracker.ietf.org/doc/html/rfc9470)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)

## Conclusion

Keep pre-MFA authority structurally separate from normal access: a different type, audience, lifetime, scope, and validation path. After MFA, issue a new session with documented method and freshness context, and preserve server-side revocation for events a signed token cannot learn on its own.
