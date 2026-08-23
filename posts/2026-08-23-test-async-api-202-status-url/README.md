# How to Test an Asynchronous API That Returns `202 Accepted` and a Status URL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, HTTP, Testing, Test Automation, REST API

Description: Test asynchronous HTTP operations from the initial 202 response through status polling, terminal failure, result verification, and cleanup.

---

An API that returns `202 Accepted` has not reported that the requested work succeeded. RFC 9110 defines the response as intentionally noncommittal: processing may not have started and may later fail. The response representation ought to describe the request's current status and point to, or embed, a status monitor.

An API test that asserts only `202` proves that the server accepted responsibility for processing. A complete test follows the operation identifier or status URL to a terminal state, verifies the resulting resource or side effect, and handles terminal failure as a failure even when every status request itself returns `200 OK`.

## Document the Asynchronous Contract

HTTP does not standardize one universal long-running-operation representation. The API contract must define:

- how the client obtains the operation ID or status URL;
- whether the URL is in `Location`, another header, or the body;
- authentication and authorization for status reads;
- nonterminal and terminal states;
- how success data or a result URL is returned;
- how processing failures are represented;
- whether cancellation is supported;
- how long completed operation records remain available; and
- any polling interval or `Retry-After` guidance.

Do not copy response fields from another provider and assume they apply. Google APIs, Microsoft APIs, and individual products use related but different long-running-operation conventions. Generate assertions from the system under test's official contract.

## Test the Initial Response Separately

The initiating request needs focused assertions:

1. the status is exactly the documented asynchronous status, commonly `202`;
2. the response identifies one operation monitor;
3. a relative monitor URL resolves against the correct API origin;
4. the monitor belongs to the authenticated tenant and request;
5. correlation headers and response media type follow the contract; and
6. no success-only result is falsely claimed before completion.

RFC 9110 does not require `Location` for every `202` response, so do not invent that requirement. If the API contract places `statusUrl` in JSON, test that. If it uses `Location`, test the header.

Reject unexpected monitor origins in the test client. Following an arbitrary absolute URL returned by a compromised service can leak authorization headers or turn the test runner into a request proxy. Preserve credentials only for an allowlisted API origin.

## Poll One Operation to a Terminal State

Use one absolute deadline and a short increasing interval. Poll the exact returned URL rather than finding the newest operation in a list. Stop on any documented terminal state:

- success: continue to result verification;
- failure: fail with the sanitized operation error;
- cancellation: assert it only in a cancellation scenario; or
- expiry: report that the monitor vanished before the test completed.

The following Playwright example uses `/exports` only as an application-specific route placeholder. It expects this API's contract to return `Location` and states named `queued`, `running`, `succeeded`, and `failed`:

```typescript
import { test, expect } from '@playwright/test';

test('export operation completes and exposes its result', async ({ request }) => {
  const started = await request.post('/exports', {
    data: { format: 'csv' },
  });
  expect(started.status()).toBe(202);

  const location = started.headers().location;
  expect(location).toBeTruthy();
  const apiBaseUrl = process.env.API_BASE_URL;
  expect(apiBaseUrl).toBeTruthy();
  const statusUrl = new URL(location, apiBaseUrl!);
  expect(statusUrl.origin).toBe(new URL(apiBaseUrl!).origin);

  const deadline = performance.now() + 30_000;
  const states: string[] = [];
  let operation;

  while (performance.now() < deadline) {
    const response = await request.get(statusUrl.toString());
    expect(response.ok()).toBeTruthy();
    operation = await response.json();
    states.push(operation.state);

    if (operation.state === 'succeeded') break;
    if (operation.state === 'failed') {
      throw new Error(`Export failed: ${operation.error?.code ?? 'unknown'}`);
    }
    expect(['queued', 'running']).toContain(operation.state);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  expect(operation?.state, `observed states: ${states.join(', ')}`).toBe('succeeded');
  expect(operation.resultUrl).toEqual(expect.any(String));

  const resultUrl = new URL(operation.resultUrl, apiBaseUrl!);
  expect(resultUrl.origin).toBe(new URL(apiBaseUrl!).origin);
  const result = await request.get(resultUrl.toString());
  expect(result.ok()).toBeTruthy();
  expect(result.headers()['content-type']).toContain('text/csv');
});
```

For a production suite, use a reusable polling helper with increasing intervals, jitter, a monotonic deadline, and provider-specific `Retry-After` parsing. RFC 9110 permits `Retry-After` as either delay seconds or an HTTP date. Cap any advised delay to the remaining test budget.

## Verify the Business Result

Terminal success is not the final assertion. Verify what the operation promised:

- a created resource exists and contains the requested values;
- an export can be downloaded and contains the expected records;
- a deletion actually makes the resource unavailable under the documented semantics;
- a bulk operation reports the correct item-level outcomes; or
- an event or audit entry appears exactly once.

Use stable identifiers from the initiating request and operation. Do not select the most recent result, because parallel tests can complete in a different order.

If success returns the result inline, validate it there. If the operation returns a result URL, verify that URL's origin and access rules before fetching it. A pre-signed storage URL can legitimately use another origin, but it should be an explicitly allowed contract case and must not receive the API bearer token.

## Test Failures at the Correct Phase

Asynchronous APIs have two failure phases.

**Start-time failures** occur before an operation is accepted. Examples include malformed input, missing authentication, forbidden tenant access, or a request that violates a synchronously checked precondition. These should return the API's documented immediate error rather than a status URL.

**Processing-time failures** happen after acceptance. The status resource should enter a terminal failure state with a stable, documented error representation. The test must assert both the terminal state and expected absence of partial success.

Create deliberate cases for each phase. A test that accepts either an immediate `4xx` or an eventual failure for the same fixed precondition hides contract drift.

## Cover Security and Isolation

An operation resource is itself an object requiring authorization. Test that:

- the initiating principal can read its operation;
- another user in the same tenant follows the documented policy;
- another tenant cannot read, cancel, or obtain the result;
- changing only the operation ID does not expose another operation; and
- the result URL enforces equivalent access or uses a deliberately scoped capability URL.

Do not expose secrets, internal stack traces, or cross-tenant resource details in progress or error metadata.

## Test Retries, Cancellation, and Expiry

If clients can retry the initiating request, test the API's idempotency contract. A lost `202` response can otherwise create two operations. Use the documented idempotency key or request identifier and prove whether a repeat returns the original operation, rejects the duplicate, or deliberately starts another operation.

Where cancellation exists, test queued and running operations separately. Verify the terminal state and absence of forbidden partial effects. Also test status retention: a completed operation may eventually expire, but it should remain readable for the documented window. Keep the normal test deadline well inside that window.

## Do Not Confuse 202 with Eventual Consistency

The patterns can coexist but represent different facts. `202` exposes an explicit asynchronous operation that has not completed. Eventual consistency usually means the write completed but a read path has not converged. Poll the operation monitor first. After terminal success, poll a projection only if the API documents an additional consistency delay.

## Official Documentation

- [RFC 9110 Section 15.3.3 - 202 Accepted](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3)
- [RFC 9110 Section 10.2.2 - Location](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.2)
- [RFC 9110 Section 10.2.3 - Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 7240 Section 4.1 - respond-async](https://www.rfc-editor.org/rfc/rfc7240.html#section-4.1)
- [Google AIP-151 - Long-running operations](https://google.aip.dev/151)
- [Playwright API testing](https://playwright.dev/docs/api-testing)

## Conclusion

A passing asynchronous API test follows the full lifecycle: validate acceptance, capture the documented monitor, poll within a bounded deadline, fail on terminal errors, and verify the final business result. `202 Accepted` begins the test; it does not finish it.
