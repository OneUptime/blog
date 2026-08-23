# How to Test Eventually Consistent APIs with Polling Instead of Fixed Sleeps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Testing, Reliability, Test Automation, Distributed System

Description: Replace fixed sleeps with bounded, state-aware polling that tolerates expected propagation delay while exposing terminal API failures clearly.

---

An eventually consistent API can acknowledge a successful write before every read model, replica, cache, or search index reflects it. An immediate read may legitimately return old data, while the same read a short time later returns the new state.

A fixed sleep treats propagation time as a constant. If the sleep is long, every test is slow. If it is short, the suite fails under normal load. Polling is better because it stops as soon as the expected observation appears and fails only after a defined consistency budget is exhausted.

Polling must still be designed carefully. Retrying every error for an unlimited time can turn a real authorization, validation, or server failure into an unhelpful timeout.

## Define the Consistency Contract

Before writing the test, identify four things:

1. **Trigger:** the successful write or action that begins propagation.
2. **Observation:** the documented read path where the effect should appear.
3. **Predicate:** the exact business condition that means propagation completed.
4. **Deadline:** the maximum supported time for that condition to become observable.

For example:

```text
Trigger:     update document title returns success
Observation: search for the document by its exact returned ID
Predicate:   result contains that ID and the new title
Deadline:    the documented search-index propagation objective
```

Do not poll merely for HTTP `200`. A stale response can be successful. Check the target ID, version, state, or value that the original write should produce.

## Prefer a Strong Read When That Is the Test's Purpose

Some systems expose both strongly consistent and eventually consistent reads. Amazon DynamoDB, for example, documents that eventually consistent reads may not reflect a recently completed write and that supported table reads can request strong consistency. Global secondary indexes remain eventually consistent.

If the test is about update correctness and the product offers a supported strong read, use it. If the test is specifically about the eventually consistent projection, query, cache, replica, or index, exercise that path and poll within its contract. Do not accidentally test propagation when a strong read would make the intended assertion direct.

## Use One Absolute Deadline

Calculate the deadline once from a monotonic clock. Every request, parsing step, and delay consumes that same budget. Do not restart the timeout after each attempt, because an unhealthy service can then keep a test alive indefinitely.

Begin with short intervals so fast propagation finishes quickly, then increase them to avoid hammering the service. Add small random jitter when many workers can poll the same system. Cap any server-provided retry guidance to the remaining test deadline.

A practical sequence might resemble 100 ms, 250 ms, 500 ms, 1 s, and then 2 s intervals. These are not universal product guarantees. Tune the deadline from the system's documented objective and the intervals from expected load.

## Poll States, Not Just Status Codes

This TypeScript helper illustrates a bounded state poll. The route and states must be replaced with the API's documented contract:

```typescript
type Observation = {
  state: 'not_visible' | 'indexing' | 'ready' | 'failed';
  version?: number;
  reason?: string;
};

async function waitUntilReady(request, resourceId: string): Promise<Observation> {
  const deadline = performance.now() + 20_000;
  const delays = [100, 250, 500, 1_000, 2_000];
  const observed: Observation[] = [];

  for (let attempt = 0; performance.now() < deadline; attempt += 1) {
    const response = await request.get(`/search-status/${resourceId}`);

    if (response.status() === 401 || response.status() === 403) {
      throw new Error(`Polling is not authorized: ${response.status()}`);
    }
    if (response.status() >= 500) {
      throw new Error(`Status endpoint failed: ${response.status()}`);
    }
    if (response.status() !== 404 && !response.ok()) {
      throw new Error(`Unexpected polling response: ${response.status()}`);
    }

    const value: Observation = response.status() === 404
      ? { state: 'not_visible' }
      : await response.json();
    observed.push(value);

    if (value.state === 'ready') return value;
    if (value.state === 'failed') {
      throw new Error(`Indexing failed: ${value.reason ?? 'no reason returned'}`);
    }

    const remaining = deadline - performance.now();
    const base = delays[Math.min(attempt, delays.length - 1)];
    const jittered = Math.round(base * (0.8 + Math.random() * 0.4));
    await new Promise(resolve => setTimeout(resolve, Math.min(jittered, remaining)));
  }

  throw new Error(`Consistency deadline exceeded; observed ${JSON.stringify(observed)}`);
}
```

The example treats `404` as transient only because the hypothetical status contract allows an object to be temporarily invisible. In another API, `404` may be terminal. Encode the real contract, not a generic list of retryable statuses.

The helper fails immediately on authentication, authorization, server, and explicit terminal failures. Whether a particular `429`, `502`, or network error is retryable must come from the service contract and test objective. Broad retries can hide outages.

## Framework Polling Can Remove Boilerplate

Playwright provides `expect.poll`, including custom intervals and a timeout. It is suitable when evaluating the callback repeatedly until a matcher passes:

```typescript
await expect.poll(
  async () => {
    const response = await request.get(`/documents/${documentId}`);
    if (response.status() === 404) return undefined; // Transient by this API's contract.
    if (!response.ok()) {
      throw new Error(`Terminal polling response: ${response.status()}`);
    }
    return (await response.json()).version;
  },
  { intervals: [100, 250, 500, 1_000], timeout: 15_000 },
).toBe(expectedVersion);
```

Use a custom helper when you need different handling for transient and terminal responses, `Retry-After`, sanitized attempt history, or domain-specific states. A generic assertion retry should not make every failure retryable by accident.

## Assert Monotonic and Forbidden Transitions

Eventually consistent does not mean anything is acceptable before convergence. Define the intermediate states the product permits. A job may progress from `queued` to `running` to `complete`, but returning to `queued` after `complete` may indicate stale routing or a regression.

Record compact observations and fail when:

- an explicit terminal failure appears;
- a version moves backward when monotonic reads are promised;
- a forbidden state transition occurs;
- a different resource ID appears;
- the response violates its schema; or
- the deadline expires.

Keep attempt history bounded. Include timestamps, status, state, version, and correlation IDs, but redact tokens and sensitive bodies.

## Treat Negative Assertions Differently

Proving that a record eventually appears can stop on the first success. Proving that a forbidden record never appears requires observing the entire defined window. For tenant-isolation tests, do not poll until an empty result appears and stop immediately; a stale empty result could precede a leaked indexed record.

Where possible, use deterministic authorization checks instead of eventual negative observations. If the system's contract genuinely includes a delayed projection, hold the negative assertion for the complete risk window and state what that window proves.

## Keep Performance Tests Separate

A functional poll proves convergence within a supported deadline. It should not silently enforce a tight latency percentile. Record propagation duration as diagnostic data, and use a dedicated performance or SLO test to evaluate distributions under controlled load.

Do not increase the functional deadline whenever CI is slow without investigating. A deadline should trace back to the product's consistency contract. If there is no contract, the test cannot distinguish acceptable delay from a defect.

## Official Documentation

- [Playwright polling assertions](https://playwright.dev/docs/test-assertions#expectpoll)
- [RFC 9110 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [Amazon DynamoDB read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
- [Amazon DynamoDB global table consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_HowItWorks.html#globaltables_HowItWorks.consistency-modes)

## Conclusion

Reliable eventual-consistency tests poll a specific business predicate under one bounded deadline. They stop quickly when propagation is fast, tolerate only documented intermediate states, and fail immediately on terminal errors. Fixed sleeps guess at time; state-aware polling tests the contract.
