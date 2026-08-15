# Reset Exponential Backoff After a Successful Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Retry, Resilience, Long-Lived Clients, Jitter, TypeScript

Description: Reset a long-lived client's failure streak after confirmed success so an old outage does not penalize a later transient error.

---

A long-lived client should not carry yesterday's outage into today's retry delay. If a request succeeds, a later isolated failure should normally use the initial backoff, not the maximum delay left over from the old failure streak.

The state to track is consecutive failures, not lifetime failures.

## Model a Failure Streak

Keep the attempt counter next to the retry loop and reset it only after the operation has met the application's definition of success:

```typescript
const BASE_MS = 250;
const MAX_MS = 30_000;
const MAX_RETRIES_PER_FAILURE_STREAK = 6;

function fullJitter(attempt: number): number {
  const exponent = Math.min(attempt, 20);
  const ceiling = Math.min(MAX_MS, BASE_MS * 2 ** exponent);
  return Math.floor(Math.random() * ceiling);
}

async function runClient(signal: AbortSignal): Promise<void> {
  let consecutiveFailures = 0;

  while (!signal.aborted) {
    try {
      const response = await sendOneRequest(signal);

      if (!response.ok) {
        throw new RetryableHttpError(response.status);
      }

      await consumeAndValidate(response);
      consecutiveFailures = 0; // The operation really succeeded.
    } catch (error) {
      if (!isRetryable(error) ||
          consecutiveFailures >= MAX_RETRIES_PER_FAILURE_STREAK) {
        throw error;
      }

      const delayMs = fullJitter(consecutiveFailures);
      consecutiveFailures += 1;
      await abortableDelay(delayMs, signal);
    }
  }
}
```

Increment after computing the current delay so attempt zero uses the initial window. Put an upper bound on both the delay and the number or total duration of retries.

## Reset at the Right Success Boundary

An HTTP status line is not always enough. Reset after the unit of work is known to be usable:

- For a request-response API, reset after the accepted response body is read and validated.
- For a streaming protocol, reset after the handshake and any required application-level acknowledgement.
- For a database operation, reset only after the transaction commits.
- For a message producer, reset after the broker acknowledgement required by the delivery policy.

The gRPC connection backoff protocol illustrates this distinction. It resets connection backoff when the HTTP/2 `SETTINGS` frame confirms that the server accepted the connection, rather than merely when a TCP socket opens.

Do not reset on partial progress. If a stream emits one item and then immediately fails, resetting at the first item can turn a persistent failure into a rapid loop. Some libraries expose this behavior deliberately. For example, RxJS `retry({ resetOnSuccess: true })` resets when the source first emits, so verify that an emission is the correct health signal for that source.

## Separate Independent Backoff Domains

One global counter can let an unhealthy destination slow unrelated work. Scope state to the resource that shares a failure mode, such as:

```text
(scheme, host, port, operation class)
```

Authentication refresh, service requests, and WebSocket reconnects often deserve separate counters. A successful token refresh should reset the refresh policy, but it does not prove that the resource server is healthy.

When many callers share one destination, centralize the retry budget or circuit state so they do not each generate a full set of attempts. Keep the per-operation counter local if callers truly have independent limits.

## Avoid Premature Resets in Concurrent Clients

If multiple requests update a shared counter, one success can erase evidence of failures that occurred later. Serialize state updates or include a generation:

```typescript
type BackoffState = {
  generation: number;
  consecutiveFailures: number;
};

async function attempt(state: BackoffState): Promise<void> {
  const myGeneration = state.generation;

  try {
    await sendOneRequest();
    if (state.generation === myGeneration) {
      state.consecutiveFailures = 0;
      state.generation += 1;
    }
  } catch (error) {
    if (state.generation === myGeneration) {
      state.consecutiveFailures += 1;
    }
    throw error;
  }
}
```

In practice, a small state machine, mutex, or per-destination request coordinator is easier to reason about than unsynchronized shared integers.

## Preserve Observability After Reset

Resetting control state should not erase telemetry. Keep separate monotonic metrics such as total attempts, retry successes, terminal failures, and time spent backing off. Log the failure streak and selected delay at retry time, and record a recovery event when a streak ends.

This separation answers both operational questions: how the client should behave next, and what happened historically.

## Official Documentation

- [gRPC connection backoff protocol](https://grpc.github.io/grpc/core/md_doc_connection-backoff.html)
- [RxJS `RetryConfig.resetOnSuccess`](https://rxjs.dev/api/operators/RetryConfig)
- [AWS SDK retry behavior and full jitter](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [RFC 9110: Idempotent HTTP methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Conclusion

Treat backoff as the state of the current failure streak. Reset it only at a meaningful success boundary, scope it to the affected resource, and keep historical metrics separate from the counter that controls the next delay.
