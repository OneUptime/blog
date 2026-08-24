# Validation Summary: How to Prove an Idempotency Key Prevents Duplicate Writes Under Concurrent Requests

## Status
validated

## Post Type
Technical guide / API testing tutorial

## Technologies Covered
- HTTP API idempotency and the `Idempotency-Key` header
- IETF HTTP semantics and the HTTPAPI `Idempotency-Key` Internet-Draft
- TypeScript and Node.js `crypto.randomUUID()`
- Playwright Test, `APIRequestContext`, and `expect.poll()`
- Concurrent request barriers, failpoints, and race-condition testing
- Redis conditional writes, expiry, eviction, and persistence
- Database transactions, uniqueness constraints, locking, and transactional outbox patterns

## Sources Consulted
- [IETF Datatracker status for the Idempotency-Key draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [IETF HTTPAPI Idempotency-Key draft-07](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-07)
- [RFC 9110: HTTP Semantics, Section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [Stripe API v1 idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe advanced error handling and idempotent retries](https://docs.stripe.com/error-low-level)
- [Playwright API testing guide](https://playwright.dev/docs/api-testing)
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)
- [Playwright assertions and `expect.poll()`](https://playwright.dev/docs/test-assertions#expectpoll)
- [Node.js `crypto.randomUUID()`](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions)
- [Redis `SETNX` deprecation notice](https://redis.io/docs/latest/commands/setnx/)
- [Redis `SET` command and `NX`/expiry options](https://redis.io/docs/latest/commands/set/)
- [Redis key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL index uniqueness checks](https://www.postgresql.org/docs/current/index-unique-checks.html)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found
- The post described the IETF work as a current Internet-Draft. Draft-07 expired and was archived on 18 April 2026. The text and documentation link label now state that it is the latest published but expired draft and has not become an RFC.
- The durable-effect definition said one operation produces one committed effect, although the example intentionally commits several related effects. It now refers to one committed execution of the intended set of business effects.
- The downstream assertion could imply that a transactional outbox guarantees one delivery. Because outbox relays and brokers can deliver duplicates, the assertion now allows duplicate delivery while requiring idempotent downstream handling and one logical work item.
- The response-only comparison compared `APIResponse` objects rather than their payloads. It now compares parsed JSON bodies, while retaining the point that authoritative state is stronger evidence.
- The post said `Promise.all()` starts the requests. The `request.post()` calls start the operations; `Promise.all()` waits for their promises. The explanation now reflects that behavior.
- The Playwright example used relative URLs without stating its required setup. It now explicitly assumes that `use.baseURL` points to the isolated test service.
- A pre-claim gate guarantees arrival and contention but cannot deterministically force requests into an internal read-then-insert gap. The text now distinguishes a pre-claim gate from a failpoint inside that vulnerable window and warns against a database lock that serializes request workers and masks the race.
- The reject-while-outstanding example incorrectly assumed that a pre-claim gate always produces exactly one `201` and eleven `409` responses. A fast winner can complete before some callers inspect the record. The post now requires a second post-claim hold hook for the exact distribution.
- The conflict-policy snippet referenced an undefined `winnerId`, and its prose said every loser was replayed although the code sent one retry. The snippet now derives `winnerId` from the sole winning response, and the prose accurately describes one conflicting retry.
- The post referred to Redis `SETNX`, which Redis has deprecated in favor of `SET ... NX`, and implied expiry without qualifying a TTL. It now uses the current command form and accurately qualifies TTL expiry, configured eviction, and non-durable restart or failover loss.

## Review Notes
- The Stripe behavior is accurate for API v1 and is correctly identified as provider-specific. It should not be generalized to Stripe API v2 or unrelated APIs.
- All Playwright APIs and options used in the corrected examples are current: the `request` fixture, `get()`, `post()`, `data`, `headers`, `params`, `failOnStatusCode`, `APIResponse.status()`, `APIResponse.json()`, and `expect.poll()`.
- Draft-07 defines the header value as an RFC 8941 Structured Field String, whose strict wire syntax is quoted. The hypothetical examples are contract-specific and do not claim strict draft wire-format conformance.
- `expect.poll()` defaults to a five-second timeout; a real suite may need a contract-appropriate explicit timeout for slower CI environments.
