# Should a Backend Trust Claims from the ID Token or Call the OIDC UserInfo Endpoint?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OIDC, UserInfo, ID Token, Authentication, Security

Description: Decide when validated ID token claims are enough, when to call UserInfo, and how to bind both responses to the same OIDC subject safely.

---

A backend should always validate the ID token it receives in an OpenID Connect login. It should call UserInfo only when it needs claims that the provider contract places there. UserInfo is an optional source of authorized user claims; it is not a replacement for ID-token validation and it is not automatically more trustworthy.

The safe sequence is:

1. validate the ID token as part of the OIDC transaction;
2. establish the session identity from its `iss` and `sub`;
3. call a trusted UserInfo endpoint, normally obtained from validated discovery metadata, only if required;
4. require the UserInfo `sub` to equal the ID-token `sub` exactly; and
5. apply an explicit claim precedence and freshness policy.

## The Two Responses Answer Different Questions

An ID token is a signed authentication assertion issued to an OIDC client. It identifies the issuer and subject and describes the authentication event. The token is intended for the relying party whose client ID appears in `aud`.

UserInfo is an OAuth protected resource. The client presents the access token from the OIDC flow and receives authorized claims about the subject represented by that grant.

For the Authorization Code Flow typically used by a server-side backend:

| Property | ID token | UserInfo response |
| --- | --- | --- |
| Required for code-flow OIDC login | Yes | No |
| How it is obtained | Token response | HTTPS request with access token |
| Identity binding | Validated `iss` and `sub` | `sub` must match the ID token |
| Typical content | Authentication and selected identity claims | Authorized profile or additional claims |
| Freshness | Snapshot at token issuance | Provider-defined at request time |
| Main availability dependency | Token endpoint during login | Additional runtime provider call |
| Appropriate API credential | No | The access token is the credential, not the response |

Neither source automatically carries application authorization. Groups and roles are provider/profile-specific, and an API should normally make decisions from its own access-token contract or application policy data.

## Validate the ID Token First

Use a maintained OIDC client library and provide trusted configuration: expected issuer, client ID, allowed algorithms, verification key material bound to that issuer (normally keys from the `jwks_uri` in its validated metadata, or the registered client secret for an explicitly allowed MAC algorithm), redirect URI, and the transaction's nonce and PKCE values.

At minimum, code-flow ID-token validation includes:

- exact issuer matching;
- signature and allowed-algorithm validation;
- ensuring `aud` contains this client ID and rejecting untrusted additional audiences;
- applicable `azp` validation;
- checking `exp` with only a small, documented clock allowance;
- checking the expected `nonce` when one was sent; and
- using the validated `sub` as the subject identifier.

Do not build a session from an unverified JWT decode. Decoding is useful for diagnostics, but it proves neither who signed the token nor who should consume it.

The durable local identity key should be `(iss, sub)`, not `email`, `preferred_username`, or a display name. OIDC subject identifiers are issuer-local; the same `sub` string at two issuers can identify different people.

## When the ID Token Is Enough

The ID token is enough when the backend needs only the authentication result and claims the provider reliably includes there. A common session record is deliberately small:

```json
{
  "principal": {
    "iss": "https://id.example.com",
    "sub": "7f83b1657ff1"
  },
  "auth_time": 1786297200,
  "display": {
    "name": "Example User"
  }
}
```

This avoids an extra provider round trip and lets the application remain available after login even if UserInfo has a transient outage. It also reduces disclosure: request and persist only what the application uses.

Treat profile values as assertions received during that login, not as live directory state. OIDC defines `updated_at`, but its presence is optional and its semantics do not create a universal cache-revalidation protocol. If a business process needs the current legal name, employment state, or authorization role, define a separate freshness mechanism.

## When to Call UserInfo

Call UserInfo when all of the following are true:

- trusted provider configuration, normally validated discovery metadata, supplies a `userinfo_endpoint`;
- the provider documents the desired claim at UserInfo for the granted scopes;
- the client has a valid access token intended for that endpoint;
- the additional latency and availability dependency are acceptable; and
- the application has a clear reason to retrieve the data.

For the default plain JSON UserInfo response, a server-side request normally looks like this:

```http
GET /userinfo HTTP/1.1
Host: id.example.com
Authorization: Bearer ACCESS_TOKEN
Accept: application/json
```

Do not place the token in the query string. OIDC recommends the `Authorization` header, and bearer tokens must be protected from logs and disclosure.

UserInfo can be useful when the provider keeps ID tokens small, when profile claims are deliberately delivered only from UserInfo, or when provider behavior makes a request-time profile response fresher than the original token. "Request-time" does not guarantee "read directly from the directory"; caching remains an implementation choice.

Avoid calling UserInfo on every application API request unless the provider explicitly supports that operating model and the freshness requirement justifies it. Otherwise the identity provider becomes a latency and availability dependency for unrelated business operations.

## The Subject-Matching Rule Is Mandatory

OIDC Core warns that a UserInfo response can otherwise be involved in token substitution. The response must contain `sub`, and the client must compare it with the `sub` in the validated ID token. If they differ, none of the UserInfo values may be used.

```javascript
async function loadUserInfo({ endpoint, accessToken, idTokenClaims }) {
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`UserInfo failed with HTTP ${response.status}`);
  }

  const userInfo = await response.json();

  if (typeof userInfo.sub !== "string" || userInfo.sub !== idTokenClaims.sub) {
    throw new Error("UserInfo subject does not match validated ID token");
  }

  return userInfo;
}
```

The snippet assumes `idTokenClaims` came from full OIDC validation, `endpoint` came from trusted provider configuration such as metadata whose issuer was validated, and the client uses the default plain JSON UserInfo response. A client registered for a signed or encrypted UserInfo response must instead process the `application/jwt` JWS/JWE, validate the registered protections and, for a signed response, its required `iss` and `aud`, then apply the same `sub` check. Never derive the UserInfo URL from an untrusted token claim.

## Decide Which Claim Wins

The ID token and UserInfo can contain the same claim with different values. That is not necessarily a protocol failure: one may be an older snapshot or provider processing may differ. Scope and release policy can also affect whether a claim appears at all.

Define claim classes rather than blindly merging objects:

| Claim class | Recommended source and handling |
| --- | --- |
| `iss`, `sub`, `aud`, `exp`, `nonce`, `azp` | Validated ID token; never overwrite from unsigned profile JSON |
| Display-only profile such as `name` or `picture` | Documented ID-token or UserInfo source; tolerate absence |
| Contact data such as `email` | Respect `email_verified`; do not use as the durable key |
| Groups, roles, entitlements | Use the provider or application authorization contract, not a generic merge rule |
| App permissions and ownership | Application database or policy service |

For a plain JSON UserInfo response, TLS authenticates the endpoint connection. UserInfo can also be signed or encrypted when configured; validate those protections according to the client registration. Regardless of serialization, the `sub` equality check remains essential.

## UserInfo Is Not a Token Introspection Endpoint

UserInfo returns claims about an authenticated end-user. OAuth token introspection reports metadata about a token, such as whether it is active, when the authorization server supports that endpoint and the caller is authorized. Calling UserInfo is not a general test that an arbitrary API access token remains valid, and it does not revoke or refresh a token.

Similarly, a successful UserInfo call does not make the ID token suitable for an API. The resource server must validate the access token according to the API's token contract, checking issuer, audience, lifetime, and scopes where applicable, and then enforce authorization policy.

## Build a Failure Policy

Decide what happens when UserInfo is slow, returns 401, omits an optional claim, or is unavailable:

- If the claim is required to establish a safe session, fail the login cleanly and allow retry.
- If it is display-only, create the session from the validated ID token and show a neutral fallback.
- If the access token is expired, use the supported refresh flow rather than sending the ID token.
- If `sub` differs, reject the response and record a security event without logging tokens.
- If an authorization claim is absent, fail closed for the protected action or consult the authoritative application policy source.

Cache only the claims and duration justified by the application. Persisting an entire token or UserInfo payload "just in case" expands privacy and breach impact.

## Practical Decision Rule

Start with the smallest validated ID-token claim set necessary to establish `(iss, sub)` and a local session. Add a UserInfo call only for provider-documented claims that the application actually needs. Keep application authorization separate unless you have a precise, tested claim contract.

This approach makes the trust boundary explicit: ID-token validation proves the login, UserInfo can enrich the same subject, and the application remains responsible for deciding what that subject may do.

## Sources

- [OpenID Connect Core 1.0 — ID Token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [OpenID Connect Core 1.0 — UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [RFC 6750 — OAuth 2.0 Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)
