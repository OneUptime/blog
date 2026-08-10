# Where Should a Browser App Store OIDC Tokens? Cookies, Memory, and the BFF Pattern Compared

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OAuth 2.0, Browser Security, BFF, Token Storage, Cookies

Description: Compare browser token storage in memory and Web Storage with HttpOnly cookie sessions and the Backend for Frontend pattern.

---

For a sensitive browser application, prefer a Backend for Frontend (BFF): keep OIDC and OAuth tokens on the server and give the browser an `HttpOnly`, `Secure` session cookie. If a browser-only client is justified, keep access tokens in memory where practical and accept that same-origin malicious JavaScript can still use or steal them. Avoid treating `localStorage` as a secure token vault.

There is no browser storage choice that neutralizes a fully compromised origin. The architecture changes what malicious JavaScript can extract and reuse after it stops running:

- persistent Web Storage makes bearer tokens easy to copy;
- memory reduces persistence, but live malicious code can intercept token use or invoke exposed authorized APIs;
- an `HttpOnly` BFF cookie hides tokens from JavaScript, but injected code can still issue requests through the user's active session; and
- automatically attached cookies require CSRF defenses that explicitly supplied bearer headers generally avoid.

Choose the architecture from the threat model and operational constraints, not from a slogan such as "cookies are always safe" or "memory prevents XSS."

## Compare the Main Patterns

| Pattern | What the browser holds | Token readable by JavaScript? | Main advantages | Main costs and residual risks |
| --- | --- | --- | --- | --- |
| `localStorage` | Access and possibly refresh token | Yes | Simple; survives reload and restart | Persistent theft through XSS, compromised dependency, extension, or devtools access |
| `sessionStorage` | Access and possibly refresh token | Yes | Tab-scoped; cleared when tab closes | Still readable by same-origin JavaScript; a copied bearer token remains reusable until expiry/revocation |
| Memory | Access token in runtime state | Not necessarily directly | Shorter persistence; naturally cleared by reload | Malicious JavaScript can use or intercept it while active; reload and multi-tab renewal become harder |
| JavaScript-readable cookie | Token in cookie without `HttpOnly` | Yes | Browser-managed storage; can survive reloads | Token theft and automatic cookie transmission; CSRF if the server accepts the cookie for authentication |
| BFF session cookie | Opaque server-side session identifier, or signed/encrypted client-side session state | No, with `HttpOnly` | Tokens are not directly exposed to browser code; BFF acts as a confidential client | Server component, proxy/latency cost, CSRF defense, session security, compromised JS can still act through BFF |

The current IETF browser-based-app guidance presents BFF, token-mediating backend, and browser-only client patterns in decreasing order of security. A BFF is strongly recommended for business and sensitive applications, while simpler architectures remain choices with explicit tradeoffs.

## Why `localStorage` Is Attractive—and Dangerous

`localStorage` is synchronous, easy to use, shared by tabs on an origin, and survives browser restarts. Those properties are exactly what make a stolen bearer token persist.

```javascript
// Convenient, but any script executing on this origin can read the token.
localStorage.setItem("access_token", tokens.access_token);
```

A script injected through XSS, a compromised analytics package, or a malicious dependency can read the value and exfiltrate it. The attacker can then use a stolen bearer token from another machine until it expires or is revoked. A sender-constrained access token can prevent that replay unless the attacker also obtains or can use the bound key.

`sessionStorage` limits persistence to a tab, but it is not an XSS boundary. The storage API remains accessible to scripts running in that document's origin. Reducing the theft window is useful; describing the value as "secure" is not.

Never store tokens in URLs. Query strings can reach server and intermediary logs; both query strings and fragments can leak through browser history, screenshots, client-side logs and crash reports, copied links, and other browser surfaces. Use Authorization Code flow with PKCE rather than an implicit response that returns access tokens through the authorization endpoint.

## What In-Memory Storage Improves

Keeping an access token in a closure, module variable, or application state means a reload clears it:

```javascript
let currentAccessToken;

export function setAccessToken(value) {
  currentAccessToken = value;
}

export async function callApi(path) {
  return fetch(path, {
    headers: { Authorization: `Bearer ${currentAccessToken}` }
  });
}
```

This can reduce persistent exfiltration. It does not prevent malicious JavaScript from intercepting token use through reachable application or platform APIs, invoking exposed authorized functions, or initiating an authorization flow to acquire fresh tokens.

Memory also complicates user experience. Reloads, browser restoration, multiple tabs, and background renewal need an explicit design. Do not fix that by quietly copying a long-lived refresh token into persistent Web Storage.

If a public browser client receives refresh tokens, the authorization server must rotate them on every use or sender-constrain them, and must set a maximum lifetime or expire them after inactivity. It must bind them to the consented scopes and resource servers and must not let rotation extend a pre-established absolute lifetime; detected reuse should revoke the active refresh token and be handled as a security event. PKCE protects the authorization-code exchange; it does not bind every later bearer token to a clean JavaScript runtime.

## How the BFF Changes the Boundary

In the server-side-session BFF variant recommended here, the server component is the confidential OAuth client. It performs the code exchange, holds access and refresh tokens, and forwards API requests with the correct access token. The browser holds only a session cookie:

```text
Browser --HttpOnly session cookie--> BFF --access token--> Resource API
```

The frontend never needs to receive the OAuth tokens. An XSS payload cannot read an `HttpOnly` cookie or extract server-held tokens directly. This substantially reduces the consequence of one-time token-stealing JavaScript.

It does not make XSS harmless. Malicious code executing in the application can call the BFF while the user is signed in, read non-HttpOnly page data, alter transactions, or trigger application actions. Strong output encoding, Content Security Policy, dependency control, and ordinary web hardening remain necessary.

The BFF also becomes security-critical infrastructure. It must enforce strict outbound proxy controls and explicit upstream host/path allowlists rather than act as an unrestricted open proxy, remove session cookies before forwarding, protect tokens at rest, rotate sessions, limit response data, and preserve resource-server identity and audit context. The resource server must still enforce authorization.

## Configure BFF Cookies Deliberately

Current IETF guidance for BFF cookies requires `Secure` and `HttpOnly`, recommends `SameSite=Strict`, recommends path `/`, recommends omitting `Domain`, and recommends a suitable cookie-name prefix. A typical host-only session cookie is:

```http
Set-Cookie: __Host-Http-app_session=OPAQUE_VALUE; Path=/; Secure; HttpOnly; SameSite=Strict
```

Cookie prefixes and support vary across clients, so confirm the exact browser compatibility and server framework behavior for your deployment. The core goals are that JavaScript cannot read the cookie, the cookie is not sent over ordinary plaintext HTTP, sibling hosts do not inherit it unnecessarily, and its scope is no wider than needed.

An `HttpOnly` cookie protects confidentiality from JavaScript; it does not stop the browser from attaching the cookie to eligible requests. The BFF must implement CSRF defense for state-changing operations. Depending on topology, that can include `SameSite`, strict Origin checks, a framework anti-forgery mechanism, narrowly configured CORS with a required custom header, and rejecting CORS-safelisted state changes. Do not use GET for actions that mutate state.

## Cookies Without a BFF Are a Different Pattern

Putting a raw access token in a JavaScript-readable cookie does not gain the BFF's token isolation. Putting a raw access token in an `HttpOnly` cookie and sending it automatically to a general API changes that API into cookie-authenticated infrastructure, with CSRF, cookie scope, logout, and cross-origin consequences. It may be a deliberate same-site session design, but it is not equivalent to an OAuth resource server receiving an explicit bearer header from a BFF.

Prefer an opaque session identifier over placing large or long-lived tokens directly in browser cookies. Server-side sessions make revocation and rotation easier and avoid cookie/header size pressure. If session state is cryptographically protected in the cookie instead, plan key rotation, replay handling, maximum lifetime, and immediate invalidation requirements.

## The Token-Mediating Backend Middle Ground

A token-mediating backend performs OAuth as a confidential client and later returns an access token to the browser, which calls resource servers directly. It can keep refresh tokens and client credentials off the browser and simplify token renewal, but access tokens are still exposed to JavaScript.

This pattern can reduce backend proxy load and allow direct API calls, yet it cannot provide the BFF's protection against access-token extraction. Use short-lived, audience-restricted tokens and assess whether the operational saving justifies the increased theft consequence.

## A Practical Selection Guide

Choose a BFF when the application handles personal, financial, administrative, enterprise, or other high-value data; when refresh tokens or broad API access would have serious consequences; or when you can operate a small, tightly scoped server component.

A browser-only public client may be reasonable when:

- the application is low sensitivity;
- APIs must be called directly;
- tokens are short-lived and narrowly scoped/audience-restricted;
- the authorization server enforces code flow with PKCE;
- refresh-token protections follow current OAuth guidance; and
- the team accepts that origin compromise exposes the active session's capabilities.

For that pattern, prefer memory for access tokens where the user experience permits it. Treat Web Storage as a conscious persistence tradeoff, never as encrypted or isolated storage.

Regardless of architecture:

1. use Authorization Code flow with `S256` PKCE;
2. validate OAuth `state` and OIDC `nonce` when used, and validate ID tokens with a maintained library;
3. request minimum scopes and audience-restricted access;
4. keep authorization server and API origins tightly configured;
5. prevent token logging and URL leakage;
6. harden the frontend against script injection; and
7. test logout, expiry, renewal, multi-tab behavior, and compromised-script scenarios.

Storage is only one layer. The strongest design minimizes which credentials enter the browser at all and limits what an attacker can do with the session that remains.

## Sources

- [OAuth 2.0 for Browser-Based Applications — IETF Working Group Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps-27)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700)
- [RFC 7636 — Proof Key for Code Exchange](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 6265 — HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- [Cookies: HTTP State Management Mechanism — IETF Layered Cookies Draft](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-layered-cookies-02)
