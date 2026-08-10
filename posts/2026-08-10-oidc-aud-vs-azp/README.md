# OIDC `aud` vs `azp`: Validate ID Tokens with Multiple Audiences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OIDC, ID Token, JWT, Audience, Token Validation

Description: Validate OIDC ID token aud and azp claims correctly, including arrays, extension-specific authorized parties, and access-token differences.

---

In an OpenID Connect ID token, `aud` answers which audience or audiences the token is intended for. The `azp` claim, when an extension causes it to be present, identifies the authorized party to which the ID token was issued. They are related, but `azp` is not a fallback that repairs a missing audience and it is not a universal replacement for the OAuth client ID.

For an ordinary relying party, the safe validation rule is:

1. require the expected issuer;
2. require `aud` to contain this issuer-specific client ID;
3. reject additional audiences that the client does not trust;
4. apply the extension's `azp` rules when an extension is in use; and
5. when `azp` is present, normally require it to equal this client ID unless the governing extension explicitly defines another trusted relationship.

Audience processing happens alongside signature, algorithm, expiration, nonce, and other ID-token checks. Passing `aud` and `azp` alone never makes a token valid.

## What `aud` Means in an ID Token

OIDC Core requires every ID token to contain `aud`. It must contain the OAuth 2.0 `client_id` of the relying party. The claim can be either:

```json
{ "aud": "web-client-123" }
```

or, in the general case:

```json
{ "aud": ["web-client-123", "another-audience"] }
```

The JSON representation does not weaken the rule. Whether the claim is a string or an array, the current RP's exact, case-sensitive client ID must be present.

An array does not automatically mean that several independent applications can share the token. OIDC Core's current validation language requires the client to reject a token when it contains additional audiences the client does not trust. Trust must come from the deployment profile or extension—not from seeing a syntactically valid string in a signed token.

## What `azp` Means

`azp` means "authorized party." When present in an ID token, it contains an OAuth 2.0 client ID as a case-sensitive string:

```json
{
  "aud": ["web-client-123", "shared-service"],
  "azp": "web-client-123"
}
```

OIDC Core notes that `azp` occurs in practice when extensions beyond the core specification are used. Those extensions define when it appears and what additional semantics apply. This matters because a simplified rule such as "arrays always require `azp`" can miss the actual trust model.

For a client not implementing a special extension, a conservative policy is:

- the expected client ID must still be in `aud`;
- any additional audience must be explicitly trusted or the token is rejected; and
- if `azp` is present, it must equal the expected client ID.

If an ecosystem specification deliberately authorizes another presenter, implement that specification exactly and configure the trusted client relationship. Do not invent an exception at runtime based on token contents.

## The Claims Are Not Alternatives

These checks are wrong:

```javascript
// Wrong: lets azp replace a missing audience.
if (claims.aud !== CLIENT_ID && claims.azp !== CLIENT_ID) reject();

// Wrong: accepts any signed token with a plausible azp.
if (claims.azp) accept();

// Wrong: converts an array to a string and compares accidental output.
if (String(claims.aud).includes(CLIENT_ID)) accept();
```

The first pattern accepts a token that was not intended for this RP. The second ignores audience entirely. The third permits substring matches such as `client-12` inside `client-123` and handles arrays incorrectly.

Use exact membership:

```javascript
function validateIdTokenAudience(claims, expectedClientId, trustedAudiences) {
  const audiences = typeof claims.aud === "string"
    ? [claims.aud]
    : Array.isArray(claims.aud)
      ? claims.aud
      : [];

  if (!audiences.includes(expectedClientId)) {
    throw new Error("ID token audience does not include this client");
  }

  const untrusted = audiences.filter((value) => !trustedAudiences.has(value));
  if (untrusted.length > 0) {
    throw new Error("ID token contains an untrusted additional audience");
  }

  if (claims.azp !== undefined && claims.azp !== expectedClientId) {
    throw new Error("ID token authorized party is not this client");
  }
}
```

This helper is only illustrative. A maintained OIDC library should perform the protocol validation, and the library must be configured with the correct issuer, client ID, extension/profile, and allowed algorithms. Do not decode first and then choose which client configuration to trust from unverified claims.

## Validate Client IDs in Issuer Context

OAuth client IDs are identifiers assigned by an authorization server; they are not globally unique. Treat the expected client as the pair:

```text
(issuer, client_id)
```

A token from `https://issuer-a.example` with `aud: "web-client-123"` must not be accepted under the configuration for `https://issuer-b.example`, even if that second issuer assigned the same text to a client. Select a trusted issuer configuration from application routing or an allowlist, validate the issuer and signature with that issuer's keys, and then validate its audience policy.

This becomes especially important in multi-tenant and multi-provider applications. Keep separate metadata, key sets, client IDs, algorithms, audiences, and claim rules per issuer. A shared global JWKS cache keyed only by `kid` can select the wrong key because key IDs are not globally unique.

## Common Cases

### One audience, no `azp`

```json
{ "aud": "web-client-123" }
```

Accept the audience portion when the expected client ID is exactly `web-client-123`. The absence of `azp` is normal in core OIDC.

### One audience and matching `azp`

```json
{ "aud": "web-client-123", "azp": "web-client-123" }
```

The values are consistent. Still apply the extension/profile that caused `azp` to appear and complete all other validation.

### Expected client is present with an untrusted extra audience

```json
{ "aud": ["web-client-123", "unknown-service"] }
```

Do not accept merely because the expected value is present. The current OIDC Core validation rule says additional audiences must be trusted by the client. If no profile explains `unknown-service`, reject and investigate the provider/client configuration.

### `azp` names another client

```json
{
  "aud": ["web-client-123", "api-broker"],
  "azp": "mobile-client-456"
}
```

A regular `web-client-123` deployment should reject this. Only a deliberately implemented extension with a configured trusted relationship could change the result.

### Client ID appears only in `azp`

```json
{ "aud": "some-other-client", "azp": "web-client-123" }
```

Reject it. OIDC requires the RP's client ID in `aud`; `azp` does not compensate for its absence.

## Do Not Copy ID-Token Rules to Access Tokens

The same claim name can have a different audience depending on token type. In an ID token, `aud` includes the OIDC client ID. In an RFC 9068 JWT access token, `aud` identifies the resource server and `client_id` identifies the OAuth client. RFC 9068 does not define `azp` as its standard client identifier.

An API should therefore validate:

- an access-token type/profile, such as the `at+jwt` type where RFC 9068 applies;
- its expected issuer and the issuer's signature;
- its own resource identifier in `aud`;
- token time claims; and
- the resource-specific scopes, roles, or other authorization claims.

If a provider puts `azp` in access tokens, that is provider-specific behavior. Follow the provider's access-token contract; do not apply OIDC ID-token validation text as if every JWT were an ID token.

## Debugging Checklist

When a library reports an audience or authorized-party error:

1. Confirm whether the artifact is an ID token or an access token.
2. Record the exact validated `iss`, expected client ID, `aud` JSON type and values, and `azp` value without logging the full token.
3. Verify that the client ID belongs to the same issuer and environment.
4. Check whether a documented extension/profile explains multiple audiences and `azp`.
5. Look for a wrong client registration, token exchange, broker, gateway, or mobile/web client mix-up.
6. Ensure the OIDC library performs exact membership, not substring or case-insensitive matching.
7. Test negative cases: missing audience, unknown extra audience, mismatched `azp`, wrong issuer, and an access token presented as an ID token.

The right response to a surprising signed claim is not to weaken validation. Treat it as evidence that the application received the wrong token or that its configured trust relationship is incomplete.

## Sources

- [OpenID Connect Core 1.0 — ID Token Claims](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [OpenID Connect Core 1.0 — ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
- [RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://datatracker.ietf.org/doc/html/rfc9068)
- [RFC 8725 — JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
