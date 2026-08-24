# How to Test `ETag` and `If-Match` Handling for Concurrent API Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, HTTP, ETag, Optimistic Concurrency, If-Match, Playwright

Description: Verify HTTP optimistic concurrency with strong entity tags, stale `If-Match` requests, wildcard conditions, missing preconditions, and atomic lost-update protection.

---

`ETag` and `If-Match` can prevent one client from silently overwriting another client's update. The test must reproduce the lost-update sequence: two clients read the same representation, one writes successfully, and the other attempts to write using the now-stale validator.

Checking that a GET happens to include an `ETag` header is not enough. The suite must prove that comparison is strong, evaluation happens atomically with the update, a stale request has no mutation-related side effect, and the response follows the API's documented conditional-update policy.

## Use HTTP's Exact Validator Semantics

RFC 9110 defines an entity tag as an opaque quoted string, optionally prefixed with `W/` for a weak validator:

```http
ETag: "revision-7"
ETag: W/"semantically-equivalent"
```

Clients must preserve the complete value, including quotes. Do not strip quotes, parse an assumed revision number, or construct the next tag.

`If-Match` uses the **strong comparison** function. Two tags match only when neither is weak and their opaque values match character-for-character. Therefore `W/"7"` does not strongly match either `W/"7"` or `"7"`. Weak validators are suitable for some cache-validation uses, but not for `If-Match` lost-update protection.

For a state-changing request, an origin server evaluates `If-Match` before performing the method when normal request checks do not take precedence. When the condition is evaluated and is false, it must not perform the requested method. RFC 9110 normally permits `412 Precondition Failed`; it also permits a `2xx` response when the server can determine that the exact requested state change already succeeded. For a strict update API, documenting and testing `412` is usually clearest.

## Reproduce the Two-Client Race

Create a resource with a unique fixture ID. Both logical clients fetch it before either update starts, so both hold the same tag. Then update with client A and attempt a conflicting update with client B's stale tag. The example assumes Playwright's `use.baseURL` points to the API under test:

```ts
import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

test('a stale If-Match cannot overwrite a newer update', async ({ request }) => {
  const id = crypto.randomUUID();
  await request.post('/v1/documents', {
    data: { id, title: 'initial', body: 'v1' },
  });

  const readA = await request.get(`/v1/documents/${id}`);
  const readB = await request.get(`/v1/documents/${id}`);
  const tagA = readA.headers()['etag'];
  const tagB = readB.headers()['etag'];

  expect(tagA).toBeTruthy();
  expect(tagB).toBe(tagA);
  expect(tagA).not.toMatch(/^W\//); // If-Match needs a strong validator
  expect(tagA).toMatch(/^"(?:[\x21\x23-\x7e]|[\u0080-\u00ff])*"$/);

  const updateA = await request.patch(`/v1/documents/${id}`, {
    headers: { 'If-Match': tagA },
    data: { title: 'client A' },
  });
  expect(updateA.status()).toBe(200);
  const tagAfterA = updateA.headers()['etag'];
  expect(tagAfterA).toBeTruthy();
  expect(tagAfterA).not.toBe(tagA);

  const staleB = await request.patch(`/v1/documents/${id}`, {
    headers: { 'If-Match': tagB },
    data: { title: 'client B' },
    failOnStatusCode: false,
  });
  expect(staleB.status()).toBe(412);

  const finalRead = await request.get(`/v1/documents/${id}`);
  expect((await finalRead.json()).title).toBe('client A');
  expect(finalRead.headers()['etag']).toBe(tagAfterA);
});
```

The final read is essential. A server can return `412` after accidentally applying the mutation. Also inspect version rows, outbox records, and audit events: a rejected update must not create mutation-related records, though a rejection audit entry is legitimate.

If the update response is `204 No Content`, it can still carry the new `ETag`. If the contract does not return the new tag, perform a GET before the next update rather than guessing it.

## Prove Atomicity Under Concurrent Requests

The sequential stale test checks semantics but may not expose a check-then-update race. Add a barrier immediately before precondition evaluation or issue many synchronized writes using the same original tag. Use an out-of-band test-control client to wait until every write is paused, release them together, and assert exactly one incompatible write wins:

```ts
const candidates = Array.from({ length: 8 }, (_, index) =>
  request.patch(`/v1/counters/${id}`, {
    headers: { 'If-Match': originalTag, 'X-Test-Gate': gateId },
    data: { label: `writer-${index}` },
    failOnStatusCode: false,
  })
);

await gate.waitForArrivals(gateId, candidates.length);
await gate.release(gateId);
const results = await Promise.all(candidates);
expect(results.filter(r => r.status() === 200)).toHaveLength(1);
expect(results.filter(r => r.status() === 412)).toHaveLength(7);
```

Keep the gate test-only and unavailable to untrusted clients. Give it a bounded timeout that releases paused requests if the test aborts.

This requires the write payloads to be mutually incompatible. If every caller asks for the same final state, RFC 9110's already-applied allowance can make multiple `2xx` responses valid. Use distinct values when testing lost-update exclusion.

At the storage layer, comparing the validator and applying the mutation must be one atomic operation or transaction. A handler that reads a version, compares it in application code, and later performs an unconditional update can let every worker pass. A typical database shape is:

```sql
UPDATE documents
SET title = :title, version = version + 1
WHERE id = :id AND version = :expected_version;
```

Exactly one affected row means success; zero means the precondition is stale or the resource no longer exists. The public ETag remains opaque even if an internal version participates in its generation.

## Test Missing Preconditions

If the endpoint requires optimistic concurrency, an unconditional `PUT`, `PATCH`, or `DELETE` should not silently bypass it. RFC 6585 defines `428 Precondition Required` specifically for an origin server that requires a request to be conditional, often to avoid lost updates.

```ts
const response = await request.patch(`/v1/documents/${id}`, {
  data: { title: 'unconditional' },
  failOnStatusCode: false,
});

expect(response.status()).toBe(428);
expect((await request.get(`/v1/documents/${id}`)).headers()['etag']).toBe(currentTag);
```

`428` is optional in HTTP, so use it only if it is the API's contract. Some APIs require another concurrency field or deliberately allow unconditional writes. The important test is that behavior is explicit.

## Cover `If-Match: *` Correctly

The wildcard is not “match any tag.” RFC 9110 says `If-Match: *` is true when the origin server has a current representation for the target resource. It is useful for “modify/delete only if this exists” behavior:

- existing resource plus `If-Match: *`: method may proceed;
- absent resource plus `If-Match: *`: method must not be performed;
- a list containing `*` and entity tags is syntactically invalid; and
- wildcard behavior does not prove a particular version is current.

For create-only behavior on an absent target, the relevant HTTP precondition is normally `If-None-Match: *`, not `If-Match: *`.

Normal request checks take precedence over preconditions. For example, an absent target can produce `404 Not Found` instead of `412` when the unconditional request would already have produced `404`; test the API's documented status while still proving that the method was not performed.

## Build a Validator Matrix

Run focused cases for:

| Request condition | Expected result for a strict update API |
| --- | --- |
| current strong tag | update succeeds and validator changes when representation changes |
| stale strong tag | `412`; requested mutation is not applied and no mutation-related hidden side effect occurs |
| current weak tag | no strong match; `412` |
| comma-separated list containing current strong tag | succeeds |
| comma-separated list with no current tag | `412` |
| malformed entity-tag syntax | documented client error |
| missing header on required endpoint | `428` |
| `If-Match: *` and existing resource | succeeds according to method contract |
| `If-Match: *` and absent resource | condition is false; a prior `404` can take precedence over `412` |

Header field names are case-insensitive. Entity-tag opaque values are not. Test through any reverse proxy or gateway used in production so it does not remove, normalize, or cache conditional headers incorrectly.

## Validate Tag Generation

A strong validator must change whenever representation data observable in a `200 GET` changes. Test every write path: full update, partial update, background job, admin action, migration, and relevant relationship change. A tag derived from `updated_at` with coarse time resolution can collide when two changes occur quickly.

Also account for content negotiation. RFC 9110 explains that simultaneous representations can need distinct strong tags-for example, gzip-coded and unencoded representation data. Do not require equal tags across `Accept`, `Accept-Encoding`, language, or API-version variants unless the server guarantees they have identical representation data and validator semantics. Include the appropriate `Vary` behavior in separate cache tests.

An update that changes no representation data may legitimately retain the same tag. Assert change only for a mutation the contract says is observable.

## Keep Error Responses Useful

A `412` response should let the client recover without leaking protected state. Depending on the API, return a problem detail explaining that the validator is stale and require a fresh GET. Do not automatically retry the rejected write with the new tag: that would overwrite the winner without letting the client reconcile changes.

Log the resource ID, safe tag fingerprint, request correlation ID, and outcome. Entity tags are generally metadata rather than secrets, but applications should not encode sensitive database information into an opaque public validator.

## Official Documentation

- [RFC 9110: HTTP Semantics - validator fields and preconditions](https://www.rfc-editor.org/rfc/rfc9110.html#name-validator-fields)
- [RFC 9110: `If-Match`](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match)
- [RFC 9110: evaluation of preconditions](https://www.rfc-editor.org/rfc/rfc9110.html#name-evaluation-of-preconditions)
- [RFC 6585: 428 Precondition Required](https://www.rfc-editor.org/rfc/rfc6585.html#section-3)
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)

## Conclusion

Correct `ETag` testing treats validators as opaque HTTP values and recreates the actual lost-update race. Prove one current strong tag wins atomically, every stale incompatible write leaves state untouched, missing and wildcard conditions follow the published contract, and all representation-changing paths advance the validator reliably.
