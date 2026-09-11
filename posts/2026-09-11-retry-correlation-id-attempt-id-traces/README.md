# Reuse Correlation IDs Across Retries and Add Fresh Attempt IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Retries, HTTP, OpenTelemetry, Distributed Tracing

Description: Keep one correlation ID for a logical HTTP operation, generate a new attempt ID for each retry, and preserve correct span relationships and server references.

---

A retry is another execution of the same intended operation. Keep the operation's correlation ID stable so a single search finds the full story, and give each attempt a fresh ID so timeouts, responses, and duplicate processing remain distinguishable.

This does not mean reusing every identifier. A retry should have a new processing span and normally a new server request ID. An idempotency key may remain stable for a protected write, but that key controls side effects rather than log grouping.

## Define the identifier lifetimes

| Identifier | Across retries |
| --- | --- |
| logical operation correlation ID | preserve |
| attempt ID | generate for each network attempt |
| attempt number | increment within this retry loop |
| server response correlation ID | record the value actually returned |
| span ID | create for the current execution |
| idempotency key for one protected write | preserve according to the API contract |

At a public boundary, a server may replace client-supplied correlation IDs. Keep your local operation ID and record the returned server ID as a separate field. That creates a bridge without assuming the server trusts the caller's chosen value.

## Implement bounded retries with explicit attempt logging

This Node.js example retries a read on selected responses. It sends a stable correlation ID and a new attempt ID on each request:

```javascript
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

function retryAfterMs(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : Math.max(0, timestamp - Date.now());
}

export async function readWithRetries(url) {
  const correlationId = randomUUID();
  const deadline = Date.now() + 10_000;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Operation deadline exceeded');
    const attemptId = randomUUID();
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'error',
      headers: {
        'X-Correlation-ID': correlationId,
        'X-Attempt-ID': attemptId,
      },
      signal: AbortSignal.timeout(Math.min(3000, remaining)),
    });
    console.log(JSON.stringify({
      event: 'http.attempt', correlation_id: correlationId,
      attempt_id: attemptId, attempt, status: response.status,
      server_correlation_id: response.headers.get('X-Correlation-ID'),
    }));
    if (![429, 502, 503, 504].includes(response.status) || attempt === 3) {
      return response;
    }
    const requestedWait = retryAfterMs(response.headers.get('Retry-After'));
    const waitMs = requestedWait ?? Math.random() * 200 * 2 ** (attempt - 1);
    await response.body?.cancel();
    if (Date.now() + waitMs >= deadline) {
      throw new Error('Retry delay exceeds operation deadline');
    }
    await delay(waitMs);
  }
}
```

The example deliberately lets transport failures and aborts propagate. If you also retry connection failures, classify them explicitly and log the failed attempt before continuing; do not catch every programming error and treat it as a transient network problem.

The ten-second budget limits request timeouts and retry waits in this function; event-loop delays can postpone timeout handling. The returned response body is consumed by its caller, but the final attempt's abort signal remains attached and can still abort body consumption after the function returns. Apply a body-size and consumption policy there as well. Returning a final error response is intentional: the caller can inspect the status and body.

[HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) allows `Retry-After` as either delay seconds or an HTTP date. If the server's requested delay exceeds your budget, stop rather than shortening it and immediately retrying.

## Keep one operation span and distinct attempt spans

A useful trace shape is a logical operation span containing the retry loop, with a separate client span for every HTTP attempt. SDK instrumentation should create and inject the current client context for each call.

With an initialized OpenTelemetry JavaScript SDK, wrap the operation:

```javascript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('example.retry-client');
const response = await tracer.startActiveSpan('inventory.lookup', async (span) => {
  try {
    return await readWithRetries('http://inventory.internal/stock');
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

Configure instrumentation that covers Node's `fetch`/Undici path; HTTP instrumentation for another client library does not automatically prove this path is covered. Inspect the resulting trace and confirm each attempt has a different span ID.

Do not capture one `traceparent` string before the loop and resend it as if each attempt were the same client span. Let the propagator inject context from the actual active attempt. For a long delayed retry, a new trace linked to the earlier execution may be clearer than one enormous trace.

## Handle server behavior and idempotency separately

The remote service can log the operation ID, attempt ID, its own request ID, and the resulting trace context. It must validate external metadata and keep authorization independent of those values.

Retries of non-idempotent writes need the API's explicit idempotency mechanism or another proof that replay is safe. A shared correlation ID alone cannot stop duplicate orders, emails, or payments. An attempt ID is especially unsuitable as an idempotency key because it changes on every execution.

Record retry decisions with bounded fields such as reason, attempt number, and outcome. Exact operation IDs belong in logs and trace attributes rather than ordinary metric dimensions.

## Verify both successful and exhausted retries

Use a local test endpoint that returns 503 twice and then 200. Assert three distinct attempt IDs, one operation correlation ID, and a separate server reference for each response. Repeat with a `Retry-After` longer than the remaining budget and confirm no early retry occurs.

Test a nonretryable 400, final-attempt 503, a connection failure, and an abort. In the trace backend, check parent relationships and span IDs rather than merely looking for three records with the same trace ID.

## Conclusion

Preserve correlation for the logical operation and create fresh identity for each execution attempt. Pair that model with bounded retry policy, distinct client spans, and the server's actual response references so a retry chain remains searchable without hiding duplicate work.

## Official Documentation

- [RFC 9110: Retry-After and HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)
- [OpenTelemetry JavaScript instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/)
- [OpenTelemetry span relationships](https://opentelemetry.io/docs/specs/otel/trace/api/)
