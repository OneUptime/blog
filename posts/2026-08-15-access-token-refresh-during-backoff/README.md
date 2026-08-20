# Refresh an Expired Access Token Once Before Replaying a Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OAuth 2.0, Access Tokens, Refresh Tokens, Retry, Backoff, HTTP

Description: Coordinate one OAuth token refresh when a request expires during backoff, then replay only once and only when replay is safe.

---

An access token can be valid on the first attempt and expire while the client waits in backoff. Retrying with the cached token normally produces another `invalid_token` response, typically with `401`. Let authentication recovery interrupt the ordinary transient-failure sequence: refresh once, then replay once.

Do not turn every `401` into an unlimited refresh loop.

## Recognize the OAuth Signal

RFC 6750 defines the bearer `invalid_token` error, normally with HTTP `401`, for an expired, revoked, malformed, or otherwise invalid access token. It says the client may obtain a new access token and retry the protected request.

This is different from:

- `insufficient_scope`, normally `403`, which refreshing cannot fix if the required scope was not part of the original grant;
- an application-specific `401` with no bearer challenge;
- a revoked or invalid refresh token, which cannot be fixed by retrying refresh and generally requires obtaining a fresh authorization grant;
- a transient `5xx` or `429`, which belongs to the normal backoff policy.

Parse the provider's documented response and `WWW-Authenticate` challenge. Do not refresh solely because the status code is `401` if the API uses it for other conditions.

## Single-Flight Concurrent Refreshes

When many requests discover expiry together, share one refresh operation:

```typescript
let accessToken: string;
let refreshToken: string;
let accessTokenExpiresAtMs: number | undefined;
let refreshInFlight: Promise<void> | undefined;

async function refreshIfCurrent(rejectedToken: string): Promise<void> {
  // A different request may already have replaced the rejected token.
  if (rejectedToken !== accessToken) {
    // Its replacement may itself be undergoing refresh.
    if (refreshInFlight) await refreshInFlight;
    return;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      // Keep the generation check inside the shared operation as well.
      if (rejectedToken !== accessToken) return;

      const refreshStartedAtMs = Date.now();
      const tokens = await oauthClient.refresh(refreshToken);
      // This adapter exposes OAuth expires_in as expiresInSeconds.
      const nextExpiresAtMs =
        tokens.expiresInSeconds === undefined
          ? undefined
          : refreshStartedAtMs + tokens.expiresInSeconds * 1_000;

      accessToken = tokens.accessToken;
      accessTokenExpiresAtMs = nextExpiresAtMs;
      if (tokens.refreshToken) {
        // OAuth permits rotation; replace the old token atomically.
        refreshToken = tokens.refreshToken;
      }
    })().finally(() => {
      refreshInFlight = undefined;
    });
  }

  await refreshInFlight;
}
```

Serializing refresh also protects refresh-token rotation. RFC 6749 requires a client to discard the old refresh token if the authorization server issues a new one.

The rejected-token comparison is as important as the in-flight promise. A late `401` produced by the old access token can arrive after the first refresh has completed and the promise has cleared. That response should reuse the newer token, or await its in-flight replacement, not start a second refresh with a rotated credential.

## Replay at Most Once

Build each request from a factory so its body and current authorization header are fresh, and require the caller to state whether replay is safe:

```typescript
async function sendAuthorized(
  makeRequest: (token: string) => Request,
  replaySafe: boolean,
  sentAfterRefresh = false,
): Promise<Response> {
  const tokenUsed = accessToken;
  const response = await fetch(makeRequest(tokenUsed));

  if (
    replaySafe &&
    !sentAfterRefresh &&
    isInvalidToken(response)
  ) {
    await response.body?.cancel();
    await refreshIfCurrent(tokenUsed);
    return sendAuthorized(makeRequest, replaySafe, true);
  }

  return response;
}
```

If the request sent after a refresh also returns `invalid_token`, surface the authentication failure. Repeated refreshes can hide revocation, bad audience configuration, clock skew, or a broken authorization server.

A streamed request body cannot necessarily be sent twice. Pass `replaySafe` as `true` only when the factory creates a new body and the operation is safe to replay.

## Check Before Retrying After Backoff

If the token response included expiration metadata, such as OAuth's relative `expires_in` lifetime, derive a local deadline and check it with a provider-appropriate skew smaller than the token lifetime before sending the next attempt:

```typescript
// Example value; configure it below the provider's shortest token lifetime.
const accessTokenExpirySkewMs = 30_000;
const tokenToCheck = accessToken;
const expiresAtMs = accessTokenExpiresAtMs;
let sentAfterRefresh = false;

if (
  expiresAtMs !== undefined &&
  Date.now() >= expiresAtMs - accessTokenExpirySkewMs
) {
  await refreshIfCurrent(tokenToCheck);
  sentAfterRefresh = true;
}
const response = await sendAuthorized(
  makeRequest,
  replaySafe,
  sentAfterRefresh,
);
```

This avoids an expired or nearly expired attempt, while the `invalid_token` path remains necessary for revocation and imperfect clocks. Use token-response expiry metadata. OAuth clients must treat access tokens as opaque, even when a token happens to be JWT-formatted; rely on claims only under an explicit provider-specific contract.

Keep authentication retry state separate from service backoff. A successful refresh resets the refresh failure streak, not the downstream service's `5xx` streak.

## Replay Only Safe Operations

RFC 9110 permits automatic retries of idempotent methods under appropriate conditions and warns against automatically retrying non-idempotent methods unless the client knows their semantics are idempotent or knows the original was not applied.

A resource server rejecting a token normally should not apply the operation, but production intermediaries and application behavior still deserve an explicit contract. For a mutating POST, use a server-supported idempotency key or do not replay automatically.

Store refresh tokens as high-value credentials, use TLS, and avoid logging tokens or authorization headers. Browser applications should follow their authorization server's architecture and storage guidance, often using a backend-for-frontend for long-lived credentials.

## Official Documentation

- [RFC 6750: OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750.html)
- [RFC 6749 Section 6: Refreshing an access token](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
- [RFC 9700: OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [RFC 9110: Idempotent HTTP methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Conclusion

Treat `invalid_token` as one authentication recovery branch, coordinate refresh across callers, atomically adopt rotated credentials, and replay the logical request no more than once. Keep ordinary service backoff and authentication state separate.
