# How to Test Idempotency Keys Under Concurrent Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Idempotency, Concurrency, HTTP API, Race Condition, Playwright

Description: Test idempotency-key behavior with synchronized concurrent requests, durable side-effect assertions, payload conflicts, failures, and key expiry.

---

Sending the same request twice in a loop does not prove idempotency under concurrency. Both sequential calls can miss the race in which two workers observe that a key is absent and both perform the write before either stores the result.

The property to prove is about durable business effects: one logical operation identified by one key produces no more than one committed execution of its intended business effects within the key's documented scope and lifetime. Response replay, conflict handling, and retry timing are additional parts of the API contract.

## Define the Contract Before the Test

Document at least these decisions for every idempotent operation:

- which methods and endpoints accept or require the key;
- the header name and maximum key length;
- key scope, such as account plus endpoint;
- retention or expiry time;
- whether request parameters are fingerprinted;
- what a concurrent duplicate receives while the first request is outstanding;
- which success and failure responses are stored; and
- whether a replay returns the original status/body or only an equivalent resource.

The IETF `Idempotency-Key` work has not become an RFC. Its latest published version, draft-07, expired on 18 April 2026; that draft recommends unique client-generated keys, permits optional request fingerprints, and recommends `409 Conflict` for a retry while the original request is still outstanding. Treat that as evolving guidance, and test the policy your API actually publishes.

Stripe provides a concrete but provider-specific contract. Its API v1 documentation says it stores the first status and body after endpoint execution begins, including `500` responses, compares parameters on reuse, and does not store a result when validation fails or a request conflicts with another still executing. Do not copy those exact semantics into a generic assertion unless your API adopts them.

## Assert the Side Effect, Not Only Responses

Suppose `POST /v1/orders` charges inventory and creates an order. A passing test must inspect authoritative state after all requests settle:

- exactly one order exists for the business operation;
- exactly one inventory reservation or ledger entry exists;
- an outbox contains exactly one event for the operation;
- exactly one downstream work item exists, or downstream handling is idempotent under duplicate delivery; and
- every accepted replay identifies the same order.

A table count is stronger than `expect(await responses[0].json()).toEqual(await responses[1].json())`. Two workers can create different rows and accidentally serialize indistinguishable responses. Conversely, a valid contract may return `409` to concurrent callers and replay the stored success only after the winner completes.

Use a unique business reference in addition to the idempotency key so the test can query all effects without relying on response data:

```ts
const runId = crypto.randomUUID();
const key = `order-${runId}`;
const body = { sku: 'sku-42', quantity: 1, clientReference: runId };
```

## Force Real Overlap with a Barrier

Calling `request.post()` repeatedly without awaiting each call starts requests close together, but `Promise.all()` only waits for those promises and does not guarantee overlap at the vulnerable code path. Add test-only synchronization below authentication and validation but immediately before or inside idempotency acquisition. It might be a gate keyed by a safe test header, a database failpoint, or an injected hook enabled only in an isolated test environment.

The server-side sequence should be conceptually atomic:

1. derive key scope and request fingerprint;
2. claim or read the durable idempotency record;
3. ensure only the owner can execute the operation;
4. commit the business write and recorded outcome with the required atomicity; and
5. release waiters or make the outcome replayable.

Pause all requests just before step 2, wait until every intended worker has arrived, then release them together. This pre-claim gate guarantees arrival and contention, but not deterministic overlap inside a broken read-then-insert window. To target that exact race when such a window exists, place a failpoint after the absence read and before the write. Never ship either hook in production or let an untrusted caller activate it.

The example assumes Playwright's `use.baseURL` points to the isolated test service.

```ts
import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

test('one key causes one committed order under overlap', async ({ request }) => {
  const runId = crypto.randomUUID();
  const key = `test-${runId}`;
  const gate = `gate-${runId}`;
  const body = { sku: 'sku-42', quantity: 1, clientReference: runId };

  await request.post(`/__test/gates/${gate}`, { data: { expected: 12 } });

  const pending = Array.from({ length: 12 }, () =>
    request.post('/v1/orders', {
      headers: {
        'Idempotency-Key': key,
        'X-Test-Concurrency-Gate': gate,
      },
      data: body,
      failOnStatusCode: false,
    })
  );

  await expect.poll(async () => {
    const status = await request.get(`/__test/gates/${gate}`);
    return (await status.json()).arrived;
  }).toBe(12);

  await request.post(`/__test/gates/${gate}/release`);
  const responses = await Promise.all(pending);

  // Adapt allowed statuses to the published contract. This API waits/replays.
  expect(responses.every(response => response.status() === 201)).toBe(true);
  const ids = await Promise.all(responses.map(async response => (await response.json()).id));
  expect(new Set(ids).size).toBe(1);

  const audit = await request.get('/__test/order-effects', { params: { clientReference: runId } });
  expect(await audit.json()).toEqual({ orders: 1, reservations: 1, outboxEvents: 1 });
});
```

Test hooks should return only synthetic test data and require an environment-level capability. An alternative is a database blocker whose lock mode conflicts with each request's critical statement while the request-side lock modes remain mutually compatible; release it after instrumentation confirms all intended workers are waiting. A mutually exclusive request-side lock would serialize the workers and could mask the race.

## Support Both Valid Concurrent Policies

Two common designs are defensible:

1. **Wait and replay:** duplicates wait for the winner and receive its stored result.
2. **Reject while outstanding:** duplicates receive the documented conflict, then may retry after the winner finishes.

With only the pre-claim gate, a fast winner can finish before some released callers inspect the record; those callers can validly receive the stored `201` instead of `409`. To assert the exact distribution below, add a second test hook that holds the owner after it claims the key until the other 11 attempts have observed the in-progress record. Then assert one execution, documented conflicts for the overlapping losers, and retry a conflicting request with the same key and identical body:

```ts
const winners = responses.filter(r => r.status() === 201);
const conflicts = responses.filter(r => r.status() === 409);
expect(winners).toHaveLength(1);
expect(conflicts).toHaveLength(11);
const winnerId = (await winners[0]!.json()).id;

const replay = await request.post('/v1/orders', {
  headers: { 'Idempotency-Key': key },
  data: body,
});
expect(replay.status()).toBe(201);
expect((await replay.json()).id).toBe(winnerId);
```

Do not assert that a `409` itself has been cached unless the contract says so. The latest published IETF draft describes it as an outstanding-request condition that can be retried without correcting the request.

## Test Parameter Mismatch and Scope

After a successful request, reuse the same key with one changed field. The server should follow its documented mismatch policy and must not perform another write under the original logical operation:

```ts
const mismatch = await request.post('/v1/orders', {
  headers: { 'Idempotency-Key': key },
  data: { ...body, quantity: 2 },
  failOnStatusCode: false,
});

expect(mismatch.status()).toBe(422); // Example contract; some APIs use 400 or 409.
```

Also test the fingerprint's canonicalization deliberately. JSON member order, insignificant whitespace, and transport compression should not accidentally define business identity unless the contract says the raw bytes are fingerprinted. Conversely, omission and explicit `null`, currency, tenant, endpoint, and authenticated principal may be significant.

Cover key scope independently:

- same key, same endpoint, same account: one logical operation;
- different keys, same payload: two operations unless business rules prevent it;
- same key in different accounts: independent if account-scoped;
- same key on a different operation: reject or treat independently exactly as documented; and
- missing, blank, overlong, or malformed key: deterministic client error when required.

## Test Failures at Each Commit Boundary

Inject failures before validation, after validation but before claiming the key, after claiming it, during the business transaction, after commit but before the response, and while storing the response. For each point, assert the published retry behavior and authoritative effects.

The most valuable case is a lost response after commit:

1. the first request commits the order;
2. the connection is severed before the client receives a response;
3. the client retries the same key and payload; and
4. the API returns or identifies the original result without a second write.

If the idempotency record and business write live in different systems, test the crash windows between them. A cache-only claim created with Redis `SET ... NX` can expire if assigned a TTL, be evicted under the configured policy, or be lost after a non-durable restart or failover while the durable business effect remains. Robust designs usually need a durable record, a database uniqueness constraint, a transaction/outbox strategy, or reconciliation appropriate to the architecture.

## Test Expiry Without Waiting

Inject a clock into the idempotency store or set record timestamps through a protected fixture API. Advance just before and just after the documented expiry boundary. Verify whether reuse becomes a new operation, is rejected, or remains protected by a separate business uniqueness rule.

Never make CI sleep for a 24-hour retention window. A fake clock must affect the component that actually evaluates expiry, not merely the test process.

## Keep the Test Diagnostic

On failure, report the hashed key, request fingerprint, gate arrival count, response status distribution, returned resource IDs, and counts for every durable effect. Do not print authorization headers, full idempotency keys from production-shaped data, or sensitive response bodies.

Run the race with several concurrency levels and repeat it. One synchronized high-contention test is valuable; a matrix across multiple service replicas and the production database topology is stronger. Keep a small deterministic version in pull requests and a heavier stress version on a schedule.

## Official Documentation

- [IETF HTTPAPI Idempotency-Key expired Internet-Draft](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header)
- [Stripe API v1 idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe advanced error handling and idempotent retries](https://docs.stripe.com/error-low-level)
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)

## Conclusion

An idempotency test is convincing only when requests overlap at the actual claim point and the suite inspects every durable side effect. Define response, fingerprint, scope, failure, and expiry semantics first; then use a barrier, fault injection, and authoritative state queries to prove that one key represents one committed operation even when the network and workers race.
