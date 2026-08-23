# Refresh OAuth Tokens in Parallel Tests Without a Login Stampede

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, OAuth, Authentication, Testing, Parallel Processing

Description: Coordinate OAuth access-token refreshes across parallel API tests without duplicate logins, stale-token races, or broken refresh-token rotation.

---

Parallel API tests can turn one expired access token into dozens of simultaneous refresh requests. This login stampede wastes capacity and can make the suite fail in surprising ways. The risk is greater when the authorization server rotates refresh tokens: one caller may replace the refresh token while another caller is still trying to use its invalidated predecessor.

The remedy is to treat token acquisition as shared infrastructure with a precise concurrency contract. Cache a usable access token, allow only one refresh for each OAuth grant at a time, publish the complete new token set atomically, and give separate workers separate grants whenever possible.

## Understand the OAuth Rules First

OAuth 2.0 access and refresh tokens have different roles. An access token is presented to a resource server. A refresh token is presented to the authorization server's token endpoint to obtain a new access token. Issuing a refresh token is optional.

RFC 6749 allows an authorization server to return a new refresh token during refresh. When it does, the client must discard the old refresh token and replace it. RFC 9700 goes further for public clients: authorization servers must use sender-constrained refresh tokens or refresh-token rotation to detect replay. Under rotation, reuse of an invalidated token can cause the authorization server to revoke the active refresh token associated with that grant.

That means two concurrent refreshes are not merely redundant. They can resemble token theft and invalidate the credentials for the entire test run.

## Prefer One Grant Per Parallel Boundary

The safest shared token is one that is not shared. If the authorization server and test environment allow it, provision a distinct test principal or OAuth grant for each process, CI shard, or worker. This provides:

- independent refresh-token rotation;
- clearer audit logs and rate attribution;
- less cross-test state; and
- easier cleanup and revocation.

Do not create a new interactive login for every test. Acquire each worker's grant once during worker setup, keep its secrets in memory or an approved secret store, and revoke or discard it during teardown according to the provider's supported lifecycle.

Sometimes all workers must use the same principal and grant. In that case, coordination must span every process that can refresh it. An in-memory promise protects only callers inside one process. Separate CI jobs require a credential broker, a shared store with atomic compare-and-swap, or an architectural change that stops them sharing the grant.

## Refresh Before Expiry with a Small Skew

Store an absolute expiry time when the token response includes `expires_in`:

```text
expiresAt = responseReceivedAt + expiresInSeconds
```

Consider the token unusable shortly before that instant. A skew of tens of seconds is common, but it should reflect request duration, clock accuracy, and the provider's behavior. Do not decode an access token and assume its claims are authoritative unless that is part of the provider's documented token format. OAuth access tokens can be opaque.

Refresh proactively when a caller asks for a token that is inside the skew window. Also support one controlled recovery after a resource server reports an invalid token. Do not refresh on every `403`: that status commonly represents insufficient authorization, which a new token will not fix.

## Implement Single-Flight Refresh in One Process

The following TypeScript manager accepts a real token endpoint and confidential-client credentials through configuration. It illustrates the concurrency pattern without assuming a specific provider:

```typescript
type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

class TokenManager {
  private current: TokenSet;
  private refreshInFlight?: Promise<TokenSet>;

  constructor(
    initial: TokenSet,
    private readonly tokenEndpoint: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    this.current = initial;
  }

  async accessToken(forceRefresh = false): Promise<string> {
    const hasLifetime = Number.isFinite(this.current.expiresAt);
    const usable = hasLifetime && Date.now() < this.current.expiresAt - 30_000;
    if (!forceRefresh && usable) return this.current.accessToken;

    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refresh().finally(() => {
        this.refreshInFlight = undefined;
      });
    }

    this.current = await this.refreshInFlight;
    return this.current.accessToken;
  }

  private async refresh(): Promise<TokenSet> {
    const formComponent = (value: string) =>
      new URLSearchParams({ value }).toString().slice('value='.length);
    const basicCredentials = Buffer.from(
      `${formComponent(this.clientId)}:${formComponent(this.clientSecret)}`,
    ).toString('base64');

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basicCredentials}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.current.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth refresh failed with status ${response.status}`);
    }

    const body = await response.json();
    if (!body.access_token || !Number.isFinite(body.expires_in)) {
      throw new Error('OAuth response omitted a usable token lifetime');
    }

    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? this.current.refreshToken,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
  }
}
```

The shared promise is the key. The first caller starts the refresh; other callers await that same promise. The finalizer clears the promise on success or failure so a later call can retry according to suite policy. The replacement access token, refresh token, and expiry are published as one object, preventing readers from observing a new access token paired with an old refresh token.

The authentication method at the token endpoint must match the client's registration and provider documentation. RFC 6749 defines HTTP Basic authentication for clients with a client password, but providers can support other methods. Public clients must not invent a client secret.

## Coordinate Multiple Processes Correctly

A shared lock alone is insufficient. Consider this sequence:

1. Worker A reads refresh token R1 and obtains a lock.
2. Worker B reads R1 and waits.
3. Worker A refreshes, stores access token A2 and rotated refresh token R2, then unlocks.
4. Worker B acquires the lock but uses its stale local copy of R1.

Worker B must re-read the token set after acquiring the lock and return the new access token if it is now usable. Updates should be conditional on the version that was read. A credential broker can make this simpler by owning the refresh tokens and exposing only valid access tokens to test workers.

Protect the store as production-sensitive credential storage. Refresh tokens must remain confidential in transit and at rest. Never put tokens in test names, assertion messages, request dumps, or CI artifacts. Redact `Authorization` headers and token response bodies.

## Retry One Request, Not the Whole Suite

Wrap authenticated requests with a narrow policy:

1. obtain a currently usable access token;
2. send the API request;
3. if the resource server explicitly reports an invalid or expired token, force one coordinated refresh;
4. retry the request once if replay is safe; and
5. surface the second failure with sanitized diagnostics.

Be careful with non-idempotent requests. RFC 9110 says a client should not automatically retry a non-idempotent method unless it knows the request semantics are idempotent or knows the original request was not applied. A `401` response normally arrives before the protected operation executes, but the test client should follow the resource server's documented behavior rather than assume this for every gateway and API.

## Test the Token Manager Itself

Use a local authorization-server test double or an isolated provider tenant to prove concurrency behavior. Useful cases include:

- 50 simultaneous callers cause exactly one token-endpoint request;
- all callers receive the same new access token;
- a rotated refresh token replaces the old token before another refresh;
- a failed refresh reaches every waiter and a later call can try again;
- callers just outside the skew reuse the cached token;
- callers inside the skew coordinate a refresh;
- one invalid-token response triggers no more than one replay per API request; and
- logs and reports contain no access token, refresh token, client secret, or authorization header.

Also run a deliberate failure test for `invalid_grant`. Do not automatically fall back to many password logins. Fail the affected worker clearly, because the grant may be expired, revoked, rotated elsewhere, or misconfigured.

## Official Documentation

- [RFC 6749 Section 1.5 - Refresh Token](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.5)
- [RFC 6749 Section 6 - Refreshing an Access Token](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
- [RFC 9700 Section 4.14 - Refresh Token Protection](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14)
- [RFC 6750 Section 3.1 - Bearer Token Error Codes](https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1)
- [RFC 9110 Section 9.2.2 - Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Conclusion

Prevent OAuth login stampedes by isolating grants at the worker boundary and using single-flight refresh wherever a grant is shared. Publish rotated token sets atomically, re-read shared state after distributed coordination, retry only well-understood failures once, and keep credentials out of diagnostics. This makes token expiry an ordinary test-harness event instead of a suite-wide race.
