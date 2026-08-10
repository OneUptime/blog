# How to Handle OIDC Logout Across App and Identity-Provider Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OIDC, Logout, Session Management, Authentication, Security

Description: Implement reliable OIDC logout across separate application and provider sessions, including RP-initiated, front-channel, and back-channel logout.

---

An OIDC application and its identity provider maintain separate sessions. Deleting the application's cookie does not necessarily end the provider session, and ending the provider session does not automatically delete every application's local session unless a logout-notification mechanism is configured.

Reliable logout starts by choosing the intended outcome:

- **Local sign-out:** end only this application's session.
- **Provider sign-out:** request that the OpenID Provider (OP) end its single-sign-on session too.
- **Federated sign-out:** notify other relying parties (RPs) through mutually supported front-channel, back-channel, or session-management mechanisms.
- **Token invalidation:** revoke an OAuth token where supported; this is related but is not the same as ending either browser session.

No single cookie deletion performs all four jobs.

## Model the Two Sessions Explicitly

After an OIDC code flow, a typical web application has:

1. an OP session cookie on `id.example.com`, which the application cannot read; and
2. an application session cookie on `app.example.com`, backed by local server state.

The application may also hold an ID token, access token, and refresh token on the server. Their lifetimes need not coincide with either the application session or the OP session. OIDC Core explicitly notes that ID-token expiration is unrelated to the authenticated session between the RP and OP.

This produces four ordinary states:

| App session | OP session | User-visible behavior |
| --- | --- | --- |
| Active | Active | App works; a new OIDC prompt may silently reuse SSO |
| Missing | Active | App is signed out, but "Sign in" may immediately sign back in |
| Active | Missing | Existing app session may continue until local expiry or notification |
| Missing | Missing | User is fully signed out of both systems |

Treat these as expected distributed state, not as evidence that the OIDC protocol is broken.

## Make Local Logout Reliable First

Local logout is under the application's control. Invalidate the server-side session, clear its browser cookie with the same path and domain attributes used to set it, and make the operation idempotent.

Do this even when the OP logout request later fails. The OpenID RP-Initiated Logout specification leaves the timing choice to the RP and warns that some OP-to-RP notifications are unreliable or may never arrive if the user declines provider logout. Clearing local state first gives the user's click a dependable minimum result.

Before deleting the session, retain only what is needed to construct the provider request:

- the validated issuer;
- a previously issued ID token for `id_token_hint`, if your policy stores it;
- the configured client ID;
- the discovered `end_session_endpoint`;
- the registered post-logout URI; and
- a fresh, one-time logout `state` value.

Do not accept an arbitrary logout target from a query parameter.

## Use RP-Initiated Logout for the OP Session

If discovery advertises `end_session_endpoint`, redirect the user's browser there. The standard request can contain:

- `id_token_hint`, recommended to identify the OP/RP session;
- `post_logout_redirect_uri`, which must be pre-registered;
- `state`, returned to correlate the post-logout callback;
- `client_id`, most commonly when `post_logout_redirect_uri` is used without `id_token_hint`; and
- optionally `logout_hint` and `ui_locales` according to provider support.

Example:

```text
https://id.example.com/logout
  ?id_token_hint=eyJ...
  &post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fsigned-out
  &state=ONE_TIME_RANDOM_VALUE
```

Build the URL with a URL API so values are encoded once. Obtain the endpoint from validated discovery metadata or trusted configuration, never from a request parameter or unverified JWT.

The OP should ask the user to confirm logout. It must do so when no `id_token_hint` is provided or when the supplied token does not belong to the current OP session with that RP and the currently logged-in user; otherwise, an attacker could use logout links for denial of service. A post-logout redirect is not guaranteed: the OP must not redirect to a URI that does not exactly match a registered value, and the user or OP policy may stop the flow.

## A Server-Side Logout Skeleton

The following Express-style pseudocode shows the ordering. Framework-specific OIDC libraries should be preferred when they implement RP-Initiated Logout correctly.

```javascript
import { randomBytes } from "node:crypto";

app.post("/logout", requireSameOriginOrCsrf, async (req, res) => {
  const sessionId = req.cookies["__Host-app_session"];
  const session = sessionId ? await sessions.get(sessionId) : null;

  const logoutContext = session && {
    endSessionEndpoint: session.oidc.endSessionEndpoint,
    idTokenHint: session.oidc.idToken,
    clientId: session.oidc.clientId,
    issuer: session.oidc.issuer
  };

  if (session) {
    await sessions.delete(session.id); // invalidate server state first
  }

  res.clearCookie("__Host-app_session", {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax"
  });

  if (!logoutContext?.endSessionEndpoint) {
    return res.redirect(303, "/signed-out?scope=local");
  }

  const state = randomBytes(32).toString("base64url");
  await logoutTransactions.put(state, {
    issuer: logoutContext.issuer,
    expiresAt: Date.now() + 5 * 60_000
  });

  const url = new URL(logoutContext.endSessionEndpoint);
  if (logoutContext.idTokenHint) {
    url.searchParams.set("id_token_hint", logoutContext.idTokenHint);
  }
  url.searchParams.set("client_id", logoutContext.clientId);
  url.searchParams.set(
    "post_logout_redirect_uri",
    "https://app.example.com/oidc/logout/callback"
  );
  url.searchParams.set("state", state);

  return res.redirect(303, url.toString());
});
```

At the callback, consume the one-time `state` record and show a neutral signed-out page. Do not recreate a login session from logout callback parameters.

Use a state-changing method and CSRF defense for the local logout endpoint. A cross-site GET that destroys a session creates logout-CSRF nuisance and can interfere with user work even if it does not disclose data.

## Handle Each Disagreement Deliberately

### App session is missing but OP session remains

This is normal after local logout. Decide whether the product should offer "Sign out of this app" and "Sign out of the identity provider" as separate choices. If the user selects provider logout but the local session is already gone, you may lack an ID-token hint. A trusted `end_session_endpoint` plus `client_id` and a registered post-logout URI can be supported by some OPs, but the OP must ask the user to confirm logout when `id_token_hint` is absent.

If a new login immediately reuses the OP session and the product needs an account chooser or fresh authentication, use appropriate OIDC authentication request controls such as `prompt` or `max_age`; do not pretend that clearing the app cookie ended SSO.

### OP session is already gone but app session remains

The application may continue because its local session is independent. End it on explicit local logout and normal expiry. If near-real-time OP-initiated sign-out is a requirement, configure and implement a supported notification mechanism rather than polling UserInfo.

RP-Initiated Logout is designed to be idempotent: requesting logout when the OP no longer considers the RP logged in is not itself an error. The local operation should be idempotent too.

### OP logout succeeds but another RP stays signed in

Single logout across RPs requires coordination:

- **Front-channel logout** loads registered RP logout URLs through the browser. Browser privacy controls, frame restrictions, and network failures can make delivery unreliable.
- **Back-channel logout** sends a signed logout token directly from the OP to an RP endpoint. It avoids third-party-cookie dependence but requires a reachable endpoint that validates the signed logout token, plus correct replay and session handling.
- **Session Management** can detect OP session-state changes in supported browser deployments.

The OP and each RP must mutually support and configure compatible features. RP-Initiated Logout alone does not prove that every application session ended.

## Revoke Tokens Separately

OAuth token revocation, defined by RFC 7009, is an HTTPS POST from the OAuth client to the authorization server's revocation endpoint. It can be useful when a refresh token should no longer mint access tokens. It does not necessarily clear the OP's browser SSO cookie, and clearing cookies does not necessarily invalidate already issued access tokens at resource servers.

If the application stores refresh tokens, define whether local logout also revokes the refresh token. Consider the user's expectations, multi-device sessions, provider behavior, and whether revoking one grant should affect other sessions. Always remove local token copies regardless of the revocation response, and do not block local sign-out on a network call.

## Test the State Matrix

Test more than the happy path:

1. both sessions active;
2. only the app session active;
3. only the OP session active;
4. neither session active;
5. expired `id_token_hint` associated with a recent OP session;
6. missing `end_session_endpoint`;
7. invalid or unregistered post-logout URI;
8. user cancels provider logout;
9. OP timeout after local state is deleted; and
10. front-channel or back-channel notification replay and partial failure.

Record the stage and correlation ID, but never log raw tokens or cookies. A useful completion message states exactly what happened: "Signed out of this application" is more accurate than "Signed out everywhere" unless that broader result is actually known.

## Sources

- [OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
- [OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [OpenID Connect Front-Channel Logout 1.0](https://openid.net/specs/openid-connect-frontchannel-1_0.html)
- [OpenID Connect Session Management 1.0](https://openid.net/specs/openid-connect-session-1_0.html)
- [RFC 7009 - OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
