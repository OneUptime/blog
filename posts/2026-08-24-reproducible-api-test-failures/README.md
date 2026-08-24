# How to Reproduce API Test Failures with Correlation IDs and Seeds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Debugging, Observability, Playwright, Distributed Tracing, Property-Based Testing

Description: Capture a redacted replay bundle with HTTP evidence, correlation context, deterministic seeds, fixtures, and environment provenance for every failed API test.

---

“The API returned 500 in CI” is an alert, not a reproduction. To replay the failure, an engineer needs the exact logical request, relevant response, a way to find the server-side execution, the random choices that created the case, and the environment and fixture versions that gave those bytes meaning.

Build a failure bundle as part of the test harness instead of adding ad hoc logs after a rare failure disappears. The bundle must be useful, bounded, and safe: capture enough to reconstruct the request while redacting credentials and sensitive data before the artifact is written.

## Define a Replay Bundle

Use a versioned machine-readable schema. A practical record contains:

```json
{
  "schemaVersion": 1,
  "test": {
    "id": "orders/create rejects invalid discount",
    "attempt": 0,
    "worker": 3,
    "shard": "2/4"
  },
  "request": {
    "method": "POST",
    "url": "https://test-api.example/v1/orders",
    "headers": { "content-type": "application/json" },
    "body": { "sku": "SKU-42", "discount": -1 },
    "bodySha256": "..."
  },
  "response": {
    "status": 500,
    "headers": { "content-type": "application/problem+json", "x-request-id": "..." },
    "body": { "type": "...", "title": "..." },
    "bodySha256": "..."
  },
  "correlation": {
    "clientRequestId": "...",
    "traceId": "...",
    "serverRequestId": "..."
  },
  "random": {
    "seed": 1874440714,
    "path": "8:0:3"
  },
  "fixtures": {
    "tenant": "test-...",
    "scenarioVersion": "orders-v7"
  },
  "environment": {
    "commit": "...",
    "apiBuild": "...",
    "containerDigest": "sha256:...",
    "node": "...",
    "timeZone": "UTC",
    "clockMode": "real"
  },
  "timing": {
    "startedAt": "2026-08-24T12:00:00.000Z",
    "durationMs": 341,
    "timeoutMs": 30000
  }
}
```

Capture the resolved URL, not only `/v1/orders`, but remove user information and sensitive query values. Store exact body bytes or a typed body only when policy allows it. A digest and size can later verify a candidate body with high confidence, but they cannot reconstruct it or authenticate its origin. Treat digests of sensitive or guessable data as sensitive; use an approved keyed HMAC when the threat model requires protected equality checks.

## Capture at One HTTP Wrapper

Centralize API calls so every test receives the same redaction, timing, correlation, and attachment behavior. This Playwright-oriented sketch records redacted JSON request evidence with per-body caps, buffers the response, and attaches a record for each call. A production fixture can instead retain the records in memory and attach them from `afterEach` only when `testInfo.status !== testInfo.expectedStatus`:

```ts
import type { APIRequestContext, TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const MAX_EVIDENCE_BODY_BYTES = 64_000;
const MAX_EVIDENCE_HEADER_VALUE_BYTES = 4_000;

const APPROVED_RESPONSE_HEADERS = new Set([
  'content-type', 'content-length', 'content-encoding', 'date',
  'retry-after', 'x-request-id', 'traceparent',
]);

function selectHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([name]) => APPROVED_RESPONSE_HEADERS.has(name.toLowerCase()))
      .map(([name, value]) => [
        name.toLowerCase(),
        redactAndBoundHeaderValue(
          name.toLowerCase(),
          value,
          MAX_EVIDENCE_HEADER_VALUE_BYTES
        ),
      ])
  );
}

function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

async function callApi(
  request: APIRequestContext,
  testInfo: TestInfo,
  input: { method: string; url: string; data?: unknown; seed?: number }
) {
  const clientRequestId = randomUUID();
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error('API_BASE_URL is required');
  const resolvedUrl = new URL(input.url, baseUrl).toString();

  const requestHeaders: Record<string, string> = {
    'X-Request-ID': clientRequestId,
  };
  if (input.data !== undefined) requestHeaders['Content-Type'] = 'application/json';

  const startedAt = new Date().toISOString();
  const started = performance.now();
  let callError: Error | undefined;
  let evidence: Record<string, unknown> = {
    request: {
      method: input.method,
      url: redactUrl(resolvedUrl),
      headers: Object.fromEntries(
        Object.entries(requestHeaders).map(([name, value]) => [name.toLowerCase(), value])
      ),
      body: input.data === undefined
        ? null
        : redactAndBoundJson(input.data, MAX_EVIDENCE_BODY_BYTES),
    },
    correlation: { clientRequestId },
    random: { seed: input.seed ?? null },
  };

  try {
    const response = await request.fetch(resolvedUrl, {
      method: input.method,
      data: input.data,
      headers: requestHeaders,
      failOnStatusCode: false,
      maxRedirects: 0,
      maxRetries: 0,
    });

    const responseHeaders = response.headers();
    const contentType = responseHeaders['content-type'];
    const decodedBody = await response.body();
    const bodyPolicyContext = {
      url: resolvedUrl,
      status: response.status(),
      contentType,
    };
    evidence = {
      ...evidence,
      response: {
        status: response.status(),
        headers: selectHeaders(responseHeaders),
        body: redactAndBound(
          decodedBody,
          contentType,
          MAX_EVIDENCE_BODY_BYTES
        ),
        decodedBodyBytes: mayStoreBodyLength(bodyPolicyContext)
          ? decodedBody.length
          : null,
        decodedBodySha256: mayStoreBodyDigest(bodyPolicyContext)
          ? sha256(decodedBody)
          : null,
      },
      timing: { startedAt, durationMs: performance.now() - started },
    };

    return { response, evidence };
  } catch (error) {
    evidence = {
      ...evidence,
      callError: sanitizeError(error),
      timing: { startedAt, durationMs: performance.now() - started },
    };
    callError = Object.assign(normalizeError(error), { apiEvidence: evidence });
    throw callError;
  } finally {
    try {
      await testInfo.attach('api-evidence.json', {
        body: Buffer.from(JSON.stringify(evidence, null, 2)),
        contentType: 'application/json',
      });
    } catch (attachmentError) {
      if (!callError) throw normalizeError(attachmentError);
      Object.assign(callError, {
        evidenceAttachmentError: sanitizeError(attachmentError),
      });
    }
  }
}
```

`APPROVED_RESPONSE_HEADERS` must reflect a service-specific policy. A header-name allowlist alone does not make opaque or server-controlled values safe to persist. `redactAndBoundHeaderValue`, `redactUrl`, `redactAndBoundJson`, `redactAndBound`, `mayStoreBodyLength`, `mayStoreBodyDigest`, and `sanitizeError` must be real policy-enforcing functions, not placeholders shipped as protection. The bounded helpers must mark truncation explicitly. Preserve the buffered body if later assertions need it; avoid consuming a one-shot stream in a generic interceptor.

`APIResponse.body()` returns the complete buffer after Playwright's supported content decoding, so the cap above bounds only the stored evidence, not download or memory use. The `decodedBodyBytes` and `decodedBodySha256` fields describe those decoded bytes, not a compressed wire representation. Use a client or transport with a streaming response-size limit when untrusted responses may be large. This sketch also disables automatic redirects so one record maps to one HTTP exchange; if redirect behavior is under test, capture every hop instead.

Playwright's `testInfo.attach()` accepts a body or file and content type. Its Trace Viewer can expose the original request and response bodies and headers independently of this wrapper, so wrapper redaction does not sanitize traces. Disable tracing for tests whose traffic cannot be retained, or protect the entire trace with access and retention controls appropriate to the captured data.

## Capture Logical and Serialized Requests

A parsed object is convenient for replay but can hide serialization bugs. For signatures, multipart boundaries, form encoding, duplicate query keys, compressed bodies, and invalid JSON, preserve the exact transmitted bytes or a safe digest plus a separately approved binary artifact.

Record both forms when possible:

- logical method, parameters, media type, and typed body;
- resolved URL after parameter serialization;
- exact selected request headers;
- byte length and SHA-256 digest;
- exact bytes when safe and below the cap; and
- client library and version that serialized them.

Do not regenerate a webhook signature or multipart body from parsed data and call it an exact replay. Whitespace, key order, encoding, and boundary selection may be the defect.

For streaming uploads, capture fixture path or immutable artifact digest, not an unbounded in-memory copy. Retain the fixture under controlled test storage for the same period as the failure record.

## Correlate Client Evidence with Server Evidence

A correlation ID should let an operator find the exact server request. If the API supports a client request ID, generate one per attempt and send it in the documented header. Capture the server's returned request ID separately; gateways may replace or add their own ID.

For distributed tracing, W3C Trace Context standardizes the `traceparent` and optional `tracestate` HTTP fields. `traceparent` carries a version, trace ID, parent ID, and trace flags. Use a conforming tracing library to create and propagate it rather than concatenating unchecked random strings.

Capture:

- outbound client request ID;
- outbound valid `traceparent` and its trace ID;
- returned request/correlation headers;
- service and trace backend environment; and
- the outbound sampled flag and any local sampling decision.

The sampled flag is not a guarantee that a trace was retained. A trace ID is still valuable in logs when services include it, but the replay bundle should remain useful if telemetry was dropped.

Never put personal data or authentication material in `traceparent` or `tracestate`. The W3C specification explicitly discusses their privacy and correlation risks.

## Capture Every Source of Randomness

“Seed 42” only helps if every random decision uses the seeded generator. Capture seeds for:

- generated request values;
- fixture generation;
- test order or shuffle;
- retry jitter;
- concurrency schedule or injected delay;
- fault selection; and
- model-based command generation.

Property-based tools may require more than the seed. For a predicate counterexample failure, current fast-check output includes a seed and counterexample path; replaying the minimal counterexample uses both. Model-based command tests can also require a `replayPath`. Inside an async test, validate the captured parameters and await the assertion:

```ts
const seedText = process.env.FC_SEED?.trim();
const path = process.env.FC_PATH?.trim();
const seed = Number(seedText);
if (!seedText || !Number.isInteger(seed) || !path) {
  throw new Error('FC_SEED and FC_PATH are required for replay');
}

await fc.assert(
  fc.asyncProperty(orderArbitrary, async order => {
    await exerciseOrder(order);
  }),
  {
    seed,
    path,
    endOnFailure: true,
  }
);
```

Store the fast-check version because generation and shrinking behavior can change across dependency versions. Also attach the final minimized counterexample directly; it is often the fastest replay input.

For ordinary test data, construct a seeded generator inside the test and pass it explicitly. Do not mix it with `Math.random()`, random UUID calls, or current time unless those values are also captured.

## Record Time and Ordering

Some failures require more than payload replay. Capture:

- request start and end in UTC;
- injected logical clock value or real-clock mode;
- server `Date` header if present;
- timeout and retry attempt;
- ordering of concurrent operations;
- synchronization barrier release order; and
- event or webhook observation order.

For a concurrency test, assign each operation a stable ID and append lifecycle events such as `created`, `sent`, `response_headers`, `body_complete`, and `failed`. A seed alone cannot reproduce an operating-system or network schedule unless the harness controls that schedule.

Avoid promising deterministic replay of an uncontrolled production race. The bundle should provide enough evidence to build a controlled barrier or fault-injection regression test.

## Capture Fixture and Environment Provenance

An identical request can behave differently against different data. Record fixture identities and versions, but do not dump the database. Useful fields include tenant, account, resource IDs, fixture builder version, migration version, feature-flag snapshot, API build, dependency lock digest, container image digest, region, and worker/shard.

Create fixtures through versioned builders and give every run an ownership marker. If policy allows, provide an export routine that captures the minimal redacted rows required to reconstruct the scenario. Otherwise retain the isolated environment briefly and link it from the bundle.

Record secrets only by availability and logical credential identity, such as `test-role=editor`, never by value, prefix, or reversible encoding.

## Redact Before Persistence

Redaction after uploading an artifact is too late. Apply it in memory before application-controlled logs, attachments, or reporter output. As noted above, Playwright traces require separate handling because they can capture traffic independently of these helpers.

Prefer allowlists for headers. At minimum exclude authorization, proxy authorization, cookies, API keys, signatures, CSRF tokens, and signed URL query parameters. For bodies, use schema-aware field paths and deny capture entirely for credentials, health records, payment data, and arbitrary file content.

Defend against:

- secrets nested in arrays or error objects;
- case variations in header and field names;
- tokens embedded in URLs;
- binary data mis-decoded as text;
- enormous or compressed bodies;
- secret values echoed by the server; and
- custom assertion messages that stringify the original object.

Bound stored evidence for every policy-approved body by bytes, retain length and digest fields only where policy permits them, and mark truncation explicitly. Encrypt sensitive-but-approved artifacts, restrict CI access, and set retention according to data classification.

## Generate a Safe Reproduction Recipe

The bundle should identify a replay tool and exact non-secret inputs:

```text
git checkout <commit>
install dependencies from the lockfile
export API_BASE_URL=<approved-test-environment>
export FC_SEED=1874440714
export FC_PATH=8:0:3
npx playwright test tests/api/orders.spec.ts --grep "invalid discount" --workers=1
```

Require the operator to obtain credentials securely. Do not emit a ready-to-run command containing a bearer token or production URL. Default the replayer to an isolated test environment, require confirmation for any non-local target, and block destructive replay against production.

If the request was state-changing, make fixture setup and cleanup explicit. Replaying the HTTP call alone against already-mutated state may produce a different, valid result.

## Turn Reproductions into Regression Tests

Once diagnosed:

1. reduce the bundle to the smallest causal request and state;
2. replace real-time or scheduler luck with an injected clock or barrier;
3. store a safe, reviewed fixture;
4. add the regression at the lowest layer that reproduces the bug;
5. keep one boundary-level test if serialization or deployment wiring mattered; and
6. remove any temporary excessive logging.

The bundle is evidence for investigation. The final regression should be deterministic by construction.

## Official Documentation

- [Playwright TestInfo attachments](https://playwright.dev/docs/api/class-testinfo#test-info-attach)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [fast-check configuration](https://fast-check.dev/docs/configuration/)
- [fast-check replay parameters](https://fast-check.dev/docs/api/interfaces/Parameters/)
- [fast-check model-based replay](https://fast-check.dev/docs/advanced/model-based-testing/#replay-model-based-tests)

## Conclusion

A reproducible API failure needs more than an error message. Capture a redacted request and response, client and server correlation context, all random replay parameters, timing and ordering, fixture identity, and immutable environment versions. Attach that bounded bundle at the HTTP wrapper, then turn the diagnosis into a controlled regression test rather than depending on the original race to happen again.
