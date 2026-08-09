# OIDC State vs Nonce vs PKCE: Which Attack Does Each One Prevent?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OAuth 2.0, PKCE, CSRF, Authentication Security

Description: Distinguish state, nonce, and PKCE by the protocol artifact each binds, the attacks each mitigates, and the checks a secure OIDC client must perform.

---

`state`, `nonce`, and PKCE are three transaction-binding mechanisms in an OpenID Connect authorization code flow. They overlap, but they are not three names for one value:

- `state` binds the authorization response to the browser transaction that started it.
- `nonce` binds an ID token to the OIDC authentication request that requested it.
- PKCE binds an authorization code to the client instance that created a one-time verifier.

Modern security guidance recognizes overlap: a correctly enforced PKCE exchange or OIDC `nonce` can also provide CSRF protection. The useful operational rule is still to keep each value separate and let a maintained OIDC library apply the profile it supports. Do not copy one random string into all three fields or remove a check simply because another control exists.

## Compare the Protocol Bindings

| Control | Sent in authorization request | Returned or proved at | Primary binding | Primary attack addressed |
| --- | --- | --- | --- | --- |
| `state` | `state=...` | Authorization response | Browser session and login transaction to callback | Login CSRF and callbacks not correlated with the initiating browser transaction |
| `nonce` | `nonce=...` | `nonce` claim in validated ID token | Authentication request to ID token | ID-token replay or substitution; also OIDC response/code injection defenses |
| PKCE | `code_challenge` and `code_challenge_method=S256` | `code_verifier` at token endpoint | Authorization code to initiating client instance | Authorization-code interception and injection |

The word “primary” matters. RFC 9700 says clients must prevent CSRF and permits reliance on PKCE when the client has ensured the authorization server supports and enforces it. It also recognizes OIDC `nonce` as CSRF protection. PKCE and nonce can therefore overlap with `state`, but each exposes a different verification point and failure signal.

## State Correlates the Browser Callback

The client generates an unpredictable `state` value before redirecting the browser, stores a transaction record, and includes the value in the authorization request. The authorization server returns it unchanged. At the callback, the client checks that the received value belongs to the same browser session and an unexpired, unused transaction.

That blocks an attacker from making a victim's browser deliver an authorization response that the victim never initiated. A random string with no stored browser binding is insufficient: it must correlate to the user agent's transaction. It should also be one-time use.

`state` can carry navigation data, but this is a common source of vulnerabilities. Prefer an opaque random lookup key whose server-side record contains a short, allow-listed relative return path. If application data must travel inside `state`, protect its integrity and, when sensitive, its confidentiality. Never trust a decoded `return_to=https://evil.example` value merely because it arrived in the `state` parameter.

Also support parallel login attempts. A single `oauth_state` slot per user session lets a second tab invalidate the first. Store several short-lived transactions keyed by distinct values and consume only the one presented at the callback.

## Nonce Correlates the ID Token

OIDC defines `nonce` as a value passed unchanged from the authentication request into the ID token's `nonce` claim. After validating the ID token-including its issuer, subject, audience, expiration, configured signature and algorithm policy, and any applicable `azp` requirements-the client must compare that claim with the nonce stored for the transaction.

This makes an old or substituted ID token fail in a new login transaction. It also helps detect authorization-code injection because the ID token obtained from an injected code carries the nonce bound to the transaction that issued that code, rather than the nonce stored for the current browser transaction. Current OAuth security guidance also recognizes nonce as a valid OIDC CSRF defense.

Nonce is not an access-token claim and does not prove that an API request is authorized. It does not stop a thief from redeeming a stolen authorization code at the token endpoint; the code verifier does that. Validate nonce at the OIDC client and reject the entire login when it is missing or mismatched under the selected flow.

Do not read the nonce from an unverified JWT and declare the response safe. Signature, issuer, audience, algorithm, and time validation must succeed as part of the same ID-token validation operation. Use the OIDC library's built-in nonce check rather than writing a partial JWT decoder.

## PKCE Binds the Code to Its Initiator

For PKCE, the client creates a high-entropy `code_verifier`, derives a `code_challenge`, and sends only the challenge in the authorization request:

```text
code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
code_challenge_method = S256
```

The authorization server records the challenge with the authorization code. During the back-channel token request, the client sends the original verifier. The server recomputes the challenge and issues tokens only when it matches.

An attacker who steals the code from a redirect cannot redeem it without the verifier. If an attacker injects a code created in another transaction, the victim client sends its own verifier, which does not match the challenge bound to the injected code.

Use `S256`; do not silently fall back to `plain`. RFC 9700 requires public clients to use PKCE, requires authorization servers to support it, and requires authorization servers to mitigate PKCE downgrade attacks. Server-side web clients also benefit because PKCE addresses code injection independently of a static client secret.

The verifier is transaction secret material. Keep it in a server-side transaction store or the platform's protected storage, give it a short lifetime, never send it through the browser authorization request, and delete it when the transaction is consumed.

## Build One Transaction with Three Independent Values

The following Node.js fragment illustrates correct value generation. It is not a replacement for an OIDC client library:

```javascript
import crypto from "node:crypto";

const randomUrlSafe = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("base64url");

const state = randomUrlSafe();
const nonce = randomUrlSafe();
const codeVerifier = randomUrlSafe(); // 32 bytes encodes to 43 characters
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier, "ascii")
  .digest("base64url");
```

Store the transaction on the server before redirecting:

```javascript
await transactionStore.put(
  state,
  {
    browserSessionId: req.session.id,
    nonce,
    codeVerifier,
    issuer: "https://id.example.com/",
    redirectUri: "https://app.example.com/oidc/callback",
    returnPath: "/orders"
  },
  { ttlSeconds: 600 }
);
```

`returnPath` should already have passed an allow-list that accepts only local application destinations. Do not store tokens in this front-channel record, and do not log any of these values in production.

The authorization request then contains each control in its own field:

```text
https://id.example.com/authorize?
  response_type=code&
  client_id=orders-web&
  redirect_uri=https%3A%2F%2Fapp.example.com%2Foidc%2Fcallback&
  scope=openid%20profile%20orders.read&
  state=STATE_VALUE&
  nonce=NONCE_VALUE&
  code_challenge=CODE_CHALLENGE&
  code_challenge_method=S256
```

Construct this URL with the OIDC library so encoding, discovery metadata, response mode, and provider requirements are handled consistently.

## Validate the Callback in a Safe Order

At the redirect endpoint:

1. Reject malformed responses and unexpected HTTP methods or response modes.
2. Retrieve and atomically consume the transaction addressed by the received `state`.
3. Verify that it exists, has not expired, and belongs to the current browser session.
4. For a multi-issuer client, validate the authorization response's issuer against the stored issuer or verify that the response arrived at that issuer's distinct redirect URI.
5. If the response is an OAuth/OIDC error, record a sanitized reason and end the transaction.
6. Exchange the code at the configured issuer's token endpoint using the exact stored `redirect_uri` and `code_verifier`.
7. Validate the ID token with the issuer's OIDC metadata and the client's configured algorithms, issuer, audience, time rules, and stored `nonce`.
8. Create the local application session only after all checks succeed.
9. Redirect only to the previously allow-listed local `returnPath`.

A callback sketch makes the separation clear:

```javascript
const receivedState = req.query.state;
const transaction = await transactionStore.take(receivedState);

if (!transaction || transaction.browserSessionId !== req.session.id) {
  throw new Error("invalid OIDC transaction state");
}

const tokens = await oidcClient.exchangeCode({
  code: req.query.code,
  redirectUri: transaction.redirectUri,
  codeVerifier: transaction.codeVerifier
});

const claims = await oidcClient.validateIdToken(tokens.id_token, {
  expectedNonce: transaction.nonce,
  expectedIssuer: transaction.issuer
});
```

The method names are illustrative. Use your library's documented callback API because it will usually perform several mandatory checks not shown here.

## Know What These Controls Do Not Fix

None of the three replaces the rest of the protocol validation:

- **Redirect URI abuse:** register exact redirect URIs and reject open redirects.
- **Authorization-server mix-up:** for multi-issuer clients, validate the authorization-response issuer before exchanging the code or use and verify a distinct callback URI for each issuer; still validate the ID token's issuer.
- **Bad audience or signature:** validate the complete ID token and validate access tokens at their resource server.
- **Malicious scripts or browser compromise:** state, nonce, and PKCE do not neutralize XSS or malware that can steal active browser state.
- **Leaked bearer access tokens:** protect tokens with TLS, short lifetimes, audience restriction, secure storage, and sender-constraining where the deployment supports it.
- **Unsafe post-login redirects:** allow-list local destinations rather than treating `state` as a trustworthy URL container.

These controls bind protocol artifacts; they do not turn untrusted inputs into trusted application data.

## Test Each Failure Independently

A useful pre-production test suite changes one artifact at a time:

- omit, alter, expire, or replay `state`; the callback must fail before session creation;
- start two parallel logins and complete both; each must use its own transaction;
- exchange a code with the wrong verifier; the token endpoint must return an `invalid_grant` error;
- omit PKCE or downgrade to `plain`; a client profile that requires PKCE must refuse to proceed;
- return an otherwise valid ID token with the wrong nonce; the OIDC client must reject it;
- return an ID token from another configured issuer; issuer validation or mix-up defenses must reject it; and
- tamper with the stored return destination; the application must refuse an external redirect.

Capture only sanitized error categories. Authorization codes, state values, nonces, verifiers, tokens, and session cookies should not appear in routine logs or traces.

## Official Documentation

- [OpenID Connect Core 1.0 incorporating errata set 2](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749.html)
- [RFC 7636: Proof Key for Code Exchange](https://www.rfc-editor.org/rfc/rfc7636.html)
- [RFC 8414: OAuth 2.0 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414.html)
- [RFC 9207: OAuth 2.0 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207.html)

## Conclusion

State, nonce, and PKCE bind different parts of an OIDC authorization code flow: the browser callback, the ID token, and the authorization code exchange. Their protections overlap, especially for CSRF and code injection, but their validation points remain distinct. Generate independent per-transaction values, store them safely, require `S256`, consume transactions once, and let a maintained OIDC library validate the complete response before creating a session.
