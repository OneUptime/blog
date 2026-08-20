# Validation Summary: Refresh an Expired Access Token Once Before Replaying a Request

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OAuth 2.0
- Bearer access tokens and refresh tokens
- Refresh-token rotation and single-flight concurrency
- TypeScript
- Fetch API `Request`, `Response`, and response-body streams
- HTTP authentication challenges and status codes
- Retry backoff and replay safety
- HTTP idempotency and idempotency keys

## Sources Consulted

- [RFC 6750 Sections 3 and 3.1: Bearer challenges and error codes](https://www.rfc-editor.org/rfc/rfc6750.html#section-3.1)
- [RFC 6749 Sections 1.4 and 1.5: Access and refresh tokens](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.4)
- [RFC 6749 Section 5.1: Successful access-token responses and `expires_in`](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.1)
- [RFC 6749 Section 5.2: Token-endpoint errors and `invalid_grant`](https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2)
- [RFC 6749 Section 6: Refresh scope and refresh-token replacement](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)
- [RFC 6749 Section 10.4: Refresh-token confidentiality and transport](https://www.rfc-editor.org/rfc/rfc6749.html#section-10.4)
- [RFC 9700 Section 4.14: Refresh-token protection and rotation](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14)
- [RFC 9110 Section 9.2.2: Idempotent-method retry rules](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110 Sections 11.6.1 and 15.5.2: `WWW-Authenticate` and `401` semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)
- [RFC 9068 Section 6: OAuth clients treating JWT access tokens as opaque](https://www.rfc-editor.org/rfc/rfc9068.html#section-6)
- [RFC 6585 Section 4: `429 Too Many Requests`](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [WHATWG Fetch Standard: Body mixin and unusable request bodies](https://fetch.spec.whatwg.org/#body-mixin)
- [WHATWG Streams Standard: `ReadableStream.cancel()`](https://streams.spec.whatwg.org/#rs-cancel)
- [ECMAScript specification: `Promise.prototype.finally`](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.finally)
- [TypeScript Handbook: Function type expressions](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-type-expressions)
- [RFC 10017 Section 6.1 transition copy: Backend for Frontend](https://auth48-transition.rfc-editor.org/authors/rfc10017.html#section-6.1)
- [GitHub author profile](https://github.com/nawazdhandala) for link-target verification

## Issues Found

- The introduction described an expired-token retry as a predictable `401`, although RFC 6750 makes `401` the recommended response rather than an absolute guarantee. It now describes the expected `invalid_token` response as typically using `401`.
- The post said `insufficient_scope` could never be fixed by refreshing with the same grant. A current access token can be narrower than the original grant, so refresh can sometimes obtain already-authorized scope. The text now says refresh cannot fix scope that was not part of the original grant.
- A revoked or invalid refresh token was said to categorically require reauthorization. The text now states that retrying refresh cannot fix it and that a fresh authorization grant is generally required, without incorrectly requiring an interactive user flow in every case.
- The refresh code replaced the access token but did not replace or clear its expiry metadata. The stale deadline could cause every later preflight check to refresh the newly issued token again. The code now derives a conservative local deadline from the adapter's `expiresInSeconds` representation of OAuth `expires_in`, updates it with the access token, and clears it when the response has no expiry metadata.
- The fixed 30-second expiry skew was presented without constraining it to the token lifetime. OAuth defines no minimum access-token lifetime, so a token lasting 30 seconds or less could appear immediately due for refresh. The post now labels the value as an example that must be configured below the provider's shortest token lifetime and guards the check when expiry is unknown.
- A late rejection for an old token could return immediately while the replacement token was itself being refreshed, causing the sole replay to use that known-bad intermediate token. The generation-mismatch path now awaits an existing refresh before returning.
- `sendAuthorized` unconditionally replayed the first `invalid_token` response even though the prose required non-replayable operations to opt out. It now requires an explicit `replaySafe` decision, gates refresh and replay on it, and carries the decision through recursion.
- A proactive expiry refresh before `sendAuthorized` did not count toward the one-refresh limit, so the same logical backoff attempt could refresh proactively and then refresh and replay again after `invalid_token`. The helper state is now named `sentAfterRefresh`, and the preflight path passes that state into `sendAuthorized` so a request sent with a freshly obtained token is not refreshed again.
- The expiry guidance allowed clients to infer lifetime from JWT claims under a loosely described provider contract. It now leads with token-response expiry metadata and states the OAuth rule that clients treat access tokens as opaque, allowing claim reliance only under an explicit provider-specific contract.

## Review Notes

- All three TypeScript blocks were syntax-checked with TypeScript 5.9.3. The syntax and Fetch APIs shown are current and non-deprecated.
- `oauthClient`, `isInvalidToken`, `makeRequest`, and `replaySafe` are intentionally application-specific. The OAuth adapter must map the actual `expires_in` or equivalent provider field to the illustrated `expiresInSeconds` value and validate the response.
- The example assumes `isInvalidToken` is a synchronous check that does not lock the response stream. If it consumes an application-specific response body, it must be asynchronous and must preserve or safely dispose of that body. `response.body?.cancel()` is valid while the stream is unlocked.
- In a cross-origin browser application, the resource server must expose `WWW-Authenticate` through CORS before client JavaScript can read it.
- The in-memory promise coordinates one JavaScript realm or process. Tabs, workers, processes, or service replicas that share one refresh token need coordination at that wider sharing boundary, especially when refresh-token rotation is enabled.
- All links in the post resolved to the described RFCs or profile at review time. The author's `www.github.com` URL redirects to the canonical GitHub profile.
