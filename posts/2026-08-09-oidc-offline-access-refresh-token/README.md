# Why `offline_access` Does Not Always Return an OIDC Refresh Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OIDC, OpenID Connect, OAuth 2.0, Refresh Tokens, offline_access, Authentication, Troubleshooting

Description: Diagnose missing OIDC refresh tokens by checking offline_access, code flow, consent, client policy, discovery metadata, and the token response.

---

Adding `offline_access` to an OpenID Connect authorization request does not turn refresh-token issuance into a client-controlled option. It requests permission to keep accessing protected resources when the user is no longer present. The OpenID Provider still evaluates the flow, consent, client registration, and security policy before deciding whether to issue a refresh token.

That distinction explains a common result: login succeeds, the token endpoint returns an ID token and access token, but there is no `refresh_token` member. Treat that as a protocol and policy diagnosis, not as evidence that the ID token library lost a JWT. A refresh token is a separate OAuth credential, is often opaque, and must be handled as a high-value secret.

## Start with What the Standards Actually Promise

OpenID Connect Core defines `offline_access` as an optional scope value that **requests** a refresh token for access while the end user is not present. It also places conditions on that request:

- the response type must result in an authorization code;
- the provider must obtain consent for offline access;
- `prompt=consent` must be used unless other conditions already permit the provider to process the offline request;
- a web application must explicitly receive or already have consent, while a native application should do so.

If the consent condition is not met, or the selected response type cannot return a code, the provider must ignore the `offline_access` request. The simplest interoperable choice is Authorization Code Flow, normally with PKCE.

OAuth 2.0 adds the other half of the answer: issuing a refresh token is optional and remains at the authorization server's discretion. The current OAuth 2.0 Security Best Current Practice requires an authorization server to make a risk-based decision about issuing one to a particular client. A server can therefore accept `offline_access` yet decline to create the long-lived credential.

The relationship is not reversible either. OpenID Connect Core permits providers to issue refresh tokens in other contexts without `offline_access`. Do not encode either of these assumptions:

```text
offline_access present  => refresh_token guaranteed       # wrong
offline_access absent   => refresh_token impossible       # also wrong
```

## Verify the Authorization Request That Reached the Provider

Inspect the actual redirect, not only the application configuration that was meant to build it. A typical request for a public client has this shape:

```http
GET /authorize?response_type=code
    &client_id=example-client
    &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
    &scope=openid%20profile%20offline_access
    &state=RANDOM_STATE
    &nonce=RANDOM_NONCE
    &code_challenge=BASE64URL_SHA256_CHALLENGE
    &code_challenge_method=S256
    &prompt=consent HTTP/1.1
Host: identity.example.com
```

Generate `state`, `nonce`, and the PKCE verifier with a cryptographically secure generator and bind them to the browser session. The example shows `prompt=consent` for a new offline grant. It is not advice to force a consent screen on every login. A provider can rely on other valid processing conditions, and provider-specific policy determines how an existing offline grant is reused.

Check these failure modes:

1. `offline_access` was added to an SDK setting but disappeared from the redirect because another scope option replaced the list.
2. The request uses `response_type=id_token`, `token`, or `id_token token` and returns no authorization code. OpenID Connect requires the provider to ignore offline access in that case. A hybrid response containing a code can meet the Core condition, but Authorization Code Flow with PKCE is the clearer modern default.
3. The request tries silent authorization with `prompt=none` when new consent is required. The `none` value cannot be combined with other prompt values. Start an interactive authorization request instead of expecting a silent flow to manufacture consent.
4. The request lacks `openid`. Without the `openid` scope it is an OAuth authorization request, not an OpenID Connect authentication request, even if the same provider handles both.

Do not record the complete authorization code, PKCE verifier, tokens, or client secret in logs. Log parameter names, response status, issuer, client ID, redirect URI, requested scopes, and random-value fingerprints only when needed for correlation.

## Inspect Discovery Without Over-Interpreting It

Fetch the configuration for the exact issuer used by the client:

```bash
oidc_issuer='https://identity.example.com'

curl --fail --silent --show-error \
  "${oidc_issuer%/}/.well-known/openid-configuration" |
  jq '{
    issuer,
    authorization_endpoint,
    token_endpoint,
    scopes_supported,
    response_types_supported,
    grant_types_supported,
    token_endpoint_auth_methods_supported
  }'
```

Confirm that the returned `issuer` exactly matches the configured issuer and that the client is sending requests to the advertised authorization and token endpoints. Look for `offline_access` in `scopes_supported`, `code` in `response_types_supported`, and `refresh_token` in `grant_types_supported` when those metadata fields are present.

There are important metadata caveats. OpenID Connect Discovery says a server may omit some supported scopes from `scopes_supported`, so absence of `offline_access` there is not conclusive. `grant_types_supported` is optional and its defined default does not advertise the refresh-token grant. Discovery is a capability signal, not proof that a specific client, user, and grant will receive a refresh token. Check the client's registered grant types and the provider's official client-policy documentation as well.

Never change the issuer to a nearby tenant, realm, or authorization-server URL just because its discovery document advertises more capabilities. Tokens, consent, client registration, and issuer validation belong to the exact issuer boundary.

## Look in the Token Response, Not the Callback

Authorization Code Flow returns a `code` to the redirect URI. Tokens arrive only after the client exchanges that code at the token endpoint. A common debugging mistake is to search the browser callback query for `refresh_token`, where it does not belong.

For a one-time diagnostic of a public PKCE client, exchange a fresh code and redact credential values while showing which members exist:

```bash
# A code is single-use. Run this only with a newly returned code.
token_endpoint='https://identity.example.com/token'
client_id='example-public-client'
redirect_uri='https://app.example.com/callback'
authorization_code='ONE_TIME_CODE'
pkce_verifier='ORIGINAL_PKCE_VERIFIER'

curl --fail-with-body --silent --show-error \
  -X POST "$token_endpoint" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode "client_id=$client_id" \
  --data-urlencode "code=$authorization_code" \
  --data-urlencode "redirect_uri=$redirect_uri" \
  --data-urlencode "code_verifier=$pkce_verifier" |
  jq '{
    error,
    error_description,
    has_access_token: has("access_token"),
    has_id_token: has("id_token"),
    has_refresh_token: has("refresh_token"),
    token_type,
    expires_in,
    scope
  }'
```

`--fail-with-body` requires curl 7.76.0 or newer; on an older diagnostic host, use `--fail` and inspect the provider's protected audit log for the error body.

Run such a test only on a controlled host: shell history and process inspection can expose one-time credentials. A confidential client must use its registered token-endpoint authentication method; do not add `client_secret` to a public-client example or put a production secret directly on a command line.

If the returned `scope` is present, compare it with the request. OAuth 2.0 requires the response to report scope when it differs from what was requested. If `offline_access` was not granted, determine whether the user declined it, the client was not allowed to request it, or server policy removed it. The absence of a response `scope` means the granted scope is treated as identical to the requested scope; it still does not override the server's discretion on refresh-token issuance.

Also inspect the unmodified token response before an SDK maps it into a session object. A serializer, allow-list, or database schema can drop an issued `refresh_token`. Record only `has_refresh_token: true` and storage success, never the value.

## Check Client and Provider Policy

When the wire request and token response are understood, review the registration for the exact `client_id`:

- Is Authorization Code Flow enabled?
- Is the refresh-token grant enabled for this client?
- Does the registered application type match the deployed web, native, or browser architecture?
- Is the redirect URI the one attached to this registration?
- Does the client use the registered token-endpoint authentication method?
- Does policy permit long-lived delegated access for this user, tenant, requested resource, and scope set?

The security policy is not incidental. Refresh tokens can mint new access tokens after the user leaves, so RFC 9700 treats them as attractive attack targets. Providers may refuse them, bind them to a client, set inactivity expiry, rotate them, or require sender-constraining for public clients. A browser-only architecture may need a provider-supported rotation design or a backend-for-frontend that keeps the refresh token out of JavaScript. Do not weaken policy merely to make a token appear.

Existing grants create another provider-specific edge case. Some providers return a refresh token only when the offline grant is first created or when consent is deliberately renewed. If the application discarded that credential, repeating a silent login may return only new short-lived tokens. Consult the provider's official documentation for its re-consent or revocation procedure; do not build an endless `prompt=consent` loop.

## Make Missing Refresh Tokens an Explicit Application State

Your callback handler should not assume that every successful login creates a renewable session:

```javascript
const tokenSet = await exchangeAuthorizationCode({ code, codeVerifier });

if (!tokenSet.refresh_token) {
  await createSession({
    accessToken: tokenSet.access_token,
    expiresIn: tokenSet.expires_in,
    renewable: false,
  });

  // Choose a product policy: short session, interactive reauthentication,
  // or a clear message that background access was not granted.
} else {
  await storeRefreshTokenEncryptedAndAtomically(tokenSet.refresh_token);
}
```

During a later refresh, a successful response may omit a new refresh token. OAuth 2.0 says the server *may* issue a replacement; when it does, the client must discard the old value and use the new one. Therefore, distinguish "no refresh token in the initial code exchange" from "no replacement refresh token in a refresh response." In the second case, retain the current token unless the provider documents rotation or the response supplies a replacement. Serialize concurrent refreshes so two workers do not race and overwrite a rotated token.

If an existing refresh token later returns `invalid_grant`, that is a separate lifecycle failure: it may be expired, revoked, rotated, replay-detected, or bound to another client. Do not solve it by repeatedly adding `offline_access`; stop retrying the rejected credential and follow a controlled reauthorization path.

## A Focused Troubleshooting Order

Use this order to avoid random configuration changes:

1. Capture the actual authorization request with sensitive values redacted.
2. Confirm `openid offline_access`, a response type that returns a code, and the required consent path.
3. Validate discovery and issuer identity, noting optional-metadata caveats.
4. Verify the exact client registration, grant enablement, application type, and token-endpoint authentication method.
5. Inspect the raw code-exchange response by key presence without logging token values.
6. Compare requested and returned scopes and check provider audit events or policy decisions.
7. Trace whether the SDK and encrypted token store preserved an issued credential.
8. Handle a policy-driven omission as a non-renewable session instead of silently assuming background access.

This separates four very different outcomes: the request never asked correctly, the provider ignored an ineligible offline request, policy declined refresh-token issuance, or the application lost a token that was actually returned.

## Official Documentation

- [OpenID Connect Core 1.0: Offline Access](https://openid.net/specs/openid-connect-core-1_0.html#OfflineAccess)
- [OpenID Connect Core 1.0: Using Refresh Tokens](https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokens)
- [OpenID Connect Discovery 1.0: Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [OAuth 2.0 RFC 6749: Refresh Tokens](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.5)
- [OAuth 2.0 RFC 6749: Authorization Code Token Response](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.1.4)
- [OAuth 2.0 RFC 6749: Refreshing an Access Token](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
- [OAuth 2.0 Security Best Current Practice RFC 9700: Refresh Token Protection](https://www.rfc-editor.org/rfc/rfc9700.html#name-refresh-token-protection)
- [OAuth 2.0 PKCE RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html)

## Conclusion

`offline_access` asks for durable access; it does not command the provider to issue a refresh token. First verify an authorization-code request, valid consent, the exact issuer, and the client's registration. Then inspect the token endpoint response and provider policy without exposing credentials. If no refresh token is issued, represent that result honestly as a non-renewable session. If one is issued, protect it as a long-lived credential and implement replacement, rotation, expiry, and reauthorization deliberately.
