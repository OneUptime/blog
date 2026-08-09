# ID Token vs Access Token in OIDC: Which Token Belongs in Your API Authorization Header?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OAuth 2.0, ID Token, Access Token, API Security, Authentication, Authorization

Description: Send the access token—not the OIDC ID token—to an API, then validate its issuer, audience, lifetime, and authorization according to the token format.

---

An API request normally carries an OAuth access token in its `Authorization` header. An OpenID Connect ID token belongs to the client that performed the login. It tells that client about the authentication event; it is not a general-purpose credential for calling an API.

```http
GET /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer ACCESS_TOKEN
```

The distinction is a security boundary, not naming preference. An ID token is normally issued with the client application's `client_id` as its audience. An access token is issued to authorize access to a protected resource. If an API accepts an ID token merely because its signature is valid, it can accept a token that was never intended for that API and create a token-substitution vulnerability.

## The Short Rule

| Token | Intended consumer | Primary purpose | Send to an API? |
| --- | --- | --- | --- |
| ID token | The OIDC client, also called the relying party | Describe the end-user authentication event and identity claims | No, except for a protocol that explicitly defines that unusual use |
| Access token | The protected resource or API | Authorize operations within its granted scope and policy | Yes |

For a conventional web or native application:

1. The client validates the ID token and uses it to establish or update its own login session.
2. The client sends an access token intended for the target API when it calls that API.
3. The API validates the access token and applies authorization policy.

Do not make the API accept either token interchangeably. A token endpoint returning both does not mean they have the same audience or purpose.

## What an ID Token Proves

OpenID Connect defines the ID token as a signed token containing claims about the authentication of an end user by an authorization server. Typical claims include:

```json
{
  "iss": "https://identity.example.com",
  "sub": "248289761001",
  "aud": "web-client-123",
  "exp": 1786259400,
  "iat": 1786255800,
  "nonce": "n-0S6_WzA2Mj"
}
```

The client validates that token against its OIDC transaction: correct issuer, its own client ID in `aud`, signature and allowed algorithm, expiry and issuance time, and the expected `nonce` when one was sent. The subject identifier can then anchor the client's session.

That client-focused audience is exactly why the ID token usually does not belong at `api.example.com`. The API is not `web-client-123`. The presence of useful-looking claims such as email, groups, or roles does not change the token's intended recipient.

An ID token also does not grant an OAuth scope to a resource server. It can describe authentication context, but it is not the resource-access credential defined by OAuth.

## What an Access Token Proves

OAuth defines an access token as the credential a client uses to access protected resources. It represents a particular authorization granted to the client, often constrained by resource, scope, subject, lifetime, and authorization-server policy.

An access token may be:

- an opaque value meaningful only to the issuing authorization server;
- a JWT following a provider-specific contract;
- a JWT access token following RFC 9068; or
- a sender-constrained token whose use also requires proof of a client key.

Do not require it to look like a JWT. OAuth does not make that universal promise. Follow the API contract and the authorization server's metadata: locally validate a supported JWT access-token profile, or use the protected introspection endpoint for an opaque token when the issuer requires it.

The token response's `token_type` tells the client how to present the token. For a bearer token, RFC 6750 defines the `Authorization: Bearer` method and recommends it over putting the token in a query string.

## Audience Is the Critical Difference

Consider a client receiving two signed JWTs:

```text
ID token:     aud = web-client-123
Access token: aud = https://api.example.com
```

Both signatures can be valid. Only the access token is addressed to the API. Signature validation proves who signed the bytes and that they were not modified; it does not prove that the token was minted for the component currently reading it.

The API must require its configured audience or resource identifier. It must not accept a token just because:

- the issuer is trusted;
- the token has a `sub` claim;
- the token has an `email` or `roles` claim;
- a JWT library successfully decoded it; or
- another service in the organization accepts it.

If an authorization server issues access tokens with more than one audience, use its documented profile and validate every applicable restriction. Do not reuse the ID token's client audience as a fallback API audience.

OAuth Resource Indicators, where supported, let a client identify the target resource using a `resource` parameter. Other providers use registered API scopes or audience-specific configuration. Use the issuer's documented method; inventing an `audience` request parameter is not portable.

## Validate the Access Token at the API

For a JWT access token, use a maintained middleware or library configured for the issuer's access-token profile. At minimum, the resource server normally needs to enforce:

- the exact trusted issuer;
- a signature from an allowed algorithm and an issuer key obtained through trusted configuration;
- the API's expected audience;
- expiry and any not-before restriction with a small, deliberate clock-skew allowance;
- token type or profile markers required by the issuer;
- scopes, roles, or permissions required for the operation; and
- any sender-constraining proof when the deployment uses mTLS or DPoP.

Do not configure a generic JWT validator to accept both ID-token and access-token audiences. Use an access-token validation configuration dedicated to the API.

For an opaque token, the API can send it to the authorization server's authenticated introspection endpoint when that is the issuer's contract. Require an `active` response and validate the returned issuer, client, audience or resource, expiry, scope, and subject semantics that the API relies on. Protect introspection credentials and cache only within the issuer's permitted lifetime and revocation model.

Authorization still happens after token validation. A valid token with `orders.read` should not be allowed to perform `orders.delete`, and a subject may still be denied by tenant, object ownership, or application policy.

## Validate the ID Token at the Client

The client separately validates the ID token according to OpenID Connect Core. It should use the issuer metadata and registered client configuration, correlate the response to the login transaction, and establish a local session only after validation succeeds.

That work should not be delegated to a random downstream API. The client knows the authorization request's `nonce`, redirect flow, client ID, and session state; the API normally does not.

For a server-rendered web application, the browser often receives only a secure session cookie after login. The backend-for-frontend stores or manages tokens server-side and calls APIs with the access token. The session cookie is neither the ID token nor the API's bearer token.

## Do Not Use Access Tokens as Login Assertions Either

The reverse substitution is also unsafe. A client should not treat the contents of an access token as an OIDC login merely because the token happens to be a JWT with a `sub` claim.

The access token's audience is the resource server, and its claims format belongs to that resource contract. OpenID Connect gives the client an ID token with client-specific validation rules, including `nonce` correlation where applicable. Use that protocol output for authentication.

If the client needs additional current user claims, it can call the OIDC UserInfo endpoint with the access token and verify that the returned `sub` exactly matches the ID token's `sub`, as OpenID Connect Core requires. UserInfo is an API and therefore consumes the access token.

## Downstream APIs Need the Right Token Too

Suppose a browser client calls API A, which then calls API B. API A must not forward the ID token to B. It also should not forward an access token whose only audience is API A.

Use an authorization-server-supported on-behalf-of or token-exchange flow, or obtain an access token intended for API B through the architecture's documented delegation model. Each resource server should receive and validate a token intended for itself.

This prevents a token captured at a lower-trust service from becoming a universal credential across the internal network.

## Troubleshoot a 401 Without Swapping Tokens

When an API rejects the access token but appears to accept the ID token, do not keep the insecure workaround. Capture non-secret metadata and find the real mismatch:

1. Confirm which field in the token response the client sends.
2. Confirm the target API identifier and requested scopes or resource.
3. Compare the access token's audience with the API's configured audience when the format is inspectable.
4. Confirm the API trusts the correct issuer and access-token signing keys.
5. Check expiry, clock synchronization, required scope, and token type.
6. For an opaque token, confirm the correct introspection endpoint and API credentials.
7. Check that a proxy or gateway is not replacing or stripping the `Authorization` header.

Decode JWTs only as a diagnostic convenience; decoding is not validation. Never paste a production token into a public debugger. Record claim names and redacted identifiers rather than the raw credential.

If the access token has the client ID as its audience, consult the provider's documented token semantics before assuming it is wrong. Some issuers use non-URL audience identifiers or client identifiers for particular resources. The API and authorization server must agree on the contract; the ID token is still not a safe substitute.

## Minimize Token Exposure

Access and ID tokens can contain personal or security-sensitive data. Keep both out of URLs, logs, analytics events, error reports, and browser storage when the architecture does not require it. Use TLS, short access-token lifetimes, least-privilege scopes, and secure server-side session patterns where practical.

Bearer access tokens are usable by whoever possesses them. Sender-constrained approaches can reduce replay risk, but they do not remove the need for issuer, audience, lifetime, and authorization checks.

## Official Documentation

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- [OAuth 2.0 Authorization Framework: Access Tokens](https://www.rfc-editor.org/rfc/rfc6749.html)
- [OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750.html)
- [JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)
- [OAuth 2.0 Resource Indicators](https://www.rfc-editor.org/rfc/rfc8707.html)
- [OAuth 2.0 Token Introspection](https://www.rfc-editor.org/rfc/rfc7662.html)
- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)

## Conclusion

Send an access token intended for the target API in the authorization header. Keep the ID token at the OIDC client, where it is validated against the login transaction and used to establish the client session. At the API, validate the access token's issuer, audience, lifetime, format-specific contract, and required permissions. Never use one token as a fallback for the other merely because both are signed JWTs.
