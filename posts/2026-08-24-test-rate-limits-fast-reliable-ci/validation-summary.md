# Validation Summary: How to Test Rate Limits Without Making the CI Suite Slow or Unreliable

## Status
validated

## Post Type
Technical guide / testing guide

## Technologies Covered
- HTTP rate limiting, including fixed-window, sliding-window, token-bucket, leaky-bucket, and concurrency limits
- HTTP `429 Too Many Requests` and `Retry-After`
- IETF `RateLimit` and `RateLimit-Policy` Internet-Draft fields
- HTTP Structured Fields
- TypeScript and Node.js
- Playwright API testing
- Vitest mocks and assertions
- Distributed counter stores, reverse proxies, and CI/CD test isolation

## Sources Consulted
- [RFC 6585, Section 4: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) — status semantics, optional `Retry-After`, unspecified identity/counting policy, and the prohibition on caching `429` responses.
- [RFC 9110, Section 10.2.3: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3) — HTTP-date and `delay-seconds` syntax and semantics.
- [IETF Datatracker: RateLimit header fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) — current document status and revision history as of 2026-08-24.
- [IETF RateLimit header fields Internet-Draft, revision 11](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-11) — `RateLimit`, `RateLimit-Policy`, Structured Fields syntax, client behavior, and the non-guaranteed nature of advertised quota.
- [RFC 9651: Structured Field Values for HTTP](https://www.rfc-editor.org/rfc/rfc9651.html) — strict Structured Fields parsing and serialization rules.
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext) and [APIResponse](https://playwright.dev/docs/api/class-apiresponse) — request options, status handling, and response-header APIs.
- [Playwright API testing configuration](https://playwright.dev/docs/api-testing#configuration) — the `use.baseURL` prerequisite for relative test-service URLs.
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions) — `crypto.randomUUID()` availability and behavior.
- [TypeScript class documentation](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties) — constructor parameter properties used by `ManualClock`.
- [Vitest writing tests](https://vitest.dev/guide/learn/writing-tests#using-global-imports) and [mock API](https://vitest.dev/api/mock#mockresolvedvalue) — explicit imports, `vi.fn()`, and `mockResolvedValue()`.
- [Redis `EXPIRE`](https://redis.io/docs/latest/commands/expire/) and [`TIME`](https://redis.io/docs/latest/commands/time/) — representative confirmation that a remote store can own expiration and server time independently of an injected application clock.
- [Envoy X-Forwarded-For original IP detection](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/http/original_ip_detection/xff/v3/xff.proto.html) and [NGINX real-IP module](https://nginx.org/en/docs/http/ngx_http_realip_module.html) — trusted proxy-hop configuration and client-IP derivation.
- [Go token-bucket rate limiter](https://pkg.go.dev/golang.org/x/time/rate) — representative token refill and burst-capacity behavior.

## Issues Found
1. **`Retry-After` validation accepted invalid wire syntax.** Converting the header with `Number()` before validating it allowed values such as `+2`, `2e3`, and `0x10`, although RFC 9110 defines `delay-seconds` as one or more decimal digits. The test now validates the raw value with `/^\d+$/` before conversion and requires a safe integer. The provider-specific remaining header is likewise checked as decimal text before its numeric value is asserted.
2. **The Playwright example omitted the prerequisite for relative URLs.** Calls such as `request.get('/v1/search')` require a configured base URL. The surrounding text now states that Playwright's `use.baseURL` points to the test service.
3. **The injected-clock guidance did not account for datastore-owned time.** Advancing an in-process `ManualClock` does not advance a remote store's server clock or TTL. The post now requires every time-dependent layer in the component-test path to use the injected time, with remote expiration behavior isolated or replaced.
4. **Identity isolation was stated too broadly.** A random identity cannot isolate tests from tenant-, IP-, route-, gateway-, or global quotas that do not include that identity. The guidance now limits the guarantee to policies keyed by the test identity and notes that every applicable key dimension and broader shared quota must be considered.
5. **The proxy-header trust rule was underspecified.** A header is not trustworthy merely because it passed through a trusted proxy. The partition-matrix requirement now says that only values selected through explicitly configured trusted proxy hops can influence identity.
6. **The concurrency example never released its barrier.** Awaiting `Promise.all()` while all requests are paused by `X-Test-Gate` can deadlock. The corrected example starts the request promises, waits out of band for all arrivals, releases the gate, and only then awaits the responses. It also states that the gate must be test-only, unavailable to untrusted clients, and protected by a bounded auto-release timeout.
7. **The token-bucket transition list duplicated `empty`.** The first item was changed to `full`, restoring the intended sequence from a full bucket through depletion, refill, and the capacity cap.
8. **The Vitest snippet relied on globals without saying so.** Vitest globals are disabled by default. The snippet now explicitly imports `expect` and `vi` from `vitest`.
9. **The deployed smoke-test claim overstated its coverage.** One load-balanced check does not prove that every service replica is wired correctly. The text now describes exercising the deployed path and requires per-replica routing or observation when every replica must be covered.

## Review Notes
- On 2026-08-24, `draft-ietf-httpapi-ratelimit-headers-11`, dated 2026-05-23, is the latest active revision listed by the IETF Datatracker and remains an Internet-Draft. The post correctly warns readers to pin the revision and expect syntax changes before RFC publication.
- RFC 6585's `429` semantics, RFC 9110's two `Retry-After` forms, and RFC 9651's strict Structured Fields parsing guidance are represented accurately.
- The Playwright `headers`, `data`, and per-request `failOnStatusCode` options, along with `APIResponse.status()` and `APIResponse.headers()`, are current and non-deprecated. `failOnStatusCode: false` is valid, although it is also the default.
- `FixedWindowLimiter`, the out-of-band `gate`, and `client.getWithRetry()` are intentionally application-specific collaborators rather than library APIs. Their required behavior is described by the surrounding text.
