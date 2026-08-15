# Refresh an Expired Access Token Once Before Replaying a Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OAuth 2.0, Access Tokens, Refresh Tokens, Retry, Backoff, HTTP

Description: Coordinate one OAuth token refresh when a request expires during backoff, then replay only once and only when replay is safe.

---

An access token can be valid on the first attempt and expire while the client waits in backoff. Retrying with the cached token creates another predictable `401`. Let authentication recovery interrupt the ordinary transient-failure sequence: refresh once, then replay once.

Do not turn every `401` into an unlimited refresh loop.

## Recognize the OAuth Signal

RFC 6750 defines the bearer `invalid_token` error, normally with HTTP `401`, for an expired, revoked, malformed, or otherwise invalid access token. It says the client may obtain a new access token and retry the protected request.

This is different from:

- `insufficient_scope`, normally `403`, which a refresh with the same grant cannot fix;
- an application-specific `401` with no bearer challenge;
- a revoked or invalid refresh token, which requires reauthorization;
- a transient `5xx` or `429`, which belongs to the normal backoff policy.

Parse the provider's documented response and `WWW-Authenticate` challenge. Do not refresh solely because the status code is `401` if the API uses it for other conditions.

## Single-Flight Concurrent Refreshes

When many requests discover expiry together, share one refresh operation:

```typescript
let accessToken: string;
let refreshToken: string;
let refreshInFlight: Promise<void> | undefined;

async function refreshIfCurrent(rejectedToken: string): Promise<void> {
  // A different request may already have replaced the rejected token.
  if (rejectedToken !== accessToken) return;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      // Keep the generation check inside the shared operation as well.
      if (rejectedToken !== accessToken) return;

      const tokens = await oauthClient.refresh(refreshToken);
      accessToken = tokens.accessToken;
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

The rejected-token comparison is as important as the in-flight promise. A late `401` produced by the old access token can arrive after the first refresh has completed and the promise has cleared. That response should reuse the newer token, not start a second refresh with a rotated credential.

## Replay at Most Once

Build each request from a factory so its body and current authorization header are fresh:

```typescript
async function sendAuthorized(
  makeRequest: (token: string) => Request,
  replayedAfterRefresh = false,
): Promise<Response> {
  const tokenUsed = accessToken;
  const response = await fetch(makeRequest(tokenUsed));

  if (isInvalidToken(response) && !replayedAfterRefresh) {
    await response.body?.cancel();
    await refreshIfCurrent(tokenUsed);
    return sendAuthorized(makeRequest, true);
  }

  return response;
}
```

If the replay also returns `invalid_token`, surface the authentication failure. Repeated refreshes can hide revocation, bad audience configuration, clock skew, or a broken authorization server.

A streamed request body cannot necessarily be sent twice. The factory must create a new body, or the caller must mark the operation non-replayable.

## Check Before Retrying After Backoff

If the token response included an expiry time, check it with a small skew before sending the next attempt:

```typescript
if (Date.now() >= accessTokenExpiresAtMs - 30_000) {
  await refreshIfCurrent(accessToken);
}
const response = await sendAuthorized(makeRequest);
```

This avoids a known-expired attempt, while the `invalid_token` path remains necessary for revocation and imperfect clocks. Treat parsed JWT claims only according to the provider contract; an opaque token cannot be inspected by the client.

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
