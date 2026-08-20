# Serialize RxJS `retry` and `repeat` to Prevent Overlapping Polls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RxJS, TypeScript, Polling, Retry, Backoff, Concurrency

Description: Build an RxJS poller where retries back off and the next polling cycle starts only after the current request has completed.

---

A timer-driven poller can start a new HTTP request while the previous request is still running or waiting to retry. The problem is not `retry` itself. It is that the outer timer keeps emitting independently of the request lifecycle.

The simplest fix is to model one request, all of its retries, and the delay before the next poll as one serial Observable.

## How the Overlap Happens

This pipeline permits concurrent requests:

```typescript
import { interval, mergeMap, retry, timer } from "rxjs";
import { ajax } from "rxjs/ajax";

interval(5_000).pipe(
  mergeMap(() =>
    ajax.getJSON("/api/status").pipe(
      retry({
        count: 4,
        delay: (_error, retryCount) => timer(500 * 2 ** (retryCount - 1)),
      }),
    ),
  ),
).subscribe();
```

`mergeMap` subscribes to each inner Observable as ticks arrive. A slow request or a request inside a backoff delay remains active when the next tick creates another one.

Replacing `mergeMap` with `concatMap` serializes the work, but a fast timer can build an unbounded queue of stale ticks. `exhaustMap` avoids overlap by discarding ticks while a request is active, but the interval remains detached from completion. For a poller, completion-driven scheduling is usually clearer.

## Make One Request Cycle Cold

`ajax.getJSON` is already cold, but wrapping it in `defer` makes the creation of a new request Observable explicit for every retry and repeat. Put `retry` inside the cycle and `repeat` outside it:

```typescript
import { defer, repeat, retry, timer } from "rxjs";
import { ajax } from "rxjs/ajax";

const POLL_INTERVAL_MS = 5_000;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;

function fullJitterDelay(retryCount: number): number {
  const exponent = Math.min(retryCount - 1, 20);
  const cap = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** exponent);
  return Math.floor(Math.random() * cap);
}

const poll$ = defer(() => ajax.getJSON("/api/status")).pipe(
  retry({
    count: 4,
    delay: (_error, retryCount) => timer(fullJitterDelay(retryCount)),
  }),
  repeat({ delay: () => timer(POLL_INTERVAL_MS) }),
);

const subscription = poll$.subscribe({
  next: (status) => render(status),
  error: (error) => reportTerminalPollingFailure(error),
});

// Later, for example when a component is destroyed:
subscription.unsubscribe();
```

The sequence is now deterministic:

1. Subscribe to one cold HTTP request.
2. If it errors, wait and retry that request.
3. If it succeeds and completes, wait for the polling interval.
4. Repeat the whole cycle.

Within a single subscription to `poll$`, there is never more than one active request.

## Understand `retry` Versus `repeat`

`retry` reacts to an `error` notification by resubscribing to its source. `repeat` reacts to a `complete` notification. Their order therefore matters.

With `retry(...), repeat(...)`, a successful one-shot HTTP request completes and starts the next polling interval. An exhausted retry policy sends an error downstream and stops the poller. If the desired behavior is to cool down and begin a new retry budget after exhaustion, express that policy explicitly rather than converting every error to an ordinary value accidentally.

RxJS also provides `RetryConfig.resetOnSuccess`. It resets the retry counter when the retried source emits its first value. That is not the same as waiting for a request to complete successfully. It is useful for a long-lived source that can emit between bursts of failures, but it is unnecessary for the one-response HTTP cycle above because each `repeat` subscription gets fresh retry state.

In RxJS 7.8.2, prefer the configuration forms of `retry({ delay })` and `repeat({ delay })`. `retryWhen` and `repeatWhen` are deprecated; their API documentation says they will be removed in v9 or v10.

## Decide What Is Retryable

Do not back off every failure blindly. A `400` caused by invalid input will not improve with time, while a timeout, `429`, or many `5xx` responses may be transient. The delay callback can reject a retry by returning an Observable that errors:

```typescript
import { throwError } from "rxjs";

retry({
  count: 4,
  delay: (error: { status?: number }, retryCount) => {
    const retryable = error.status === 429 || (error.status ?? 0) >= 500;
    return retryable
      ? timer(fullJitterDelay(retryCount))
      : throwError(() => error);
  },
})
```

Also honor a valid server-provided retry delay when the API defines one, cap the total retry duration, and ensure mutating requests are idempotent before replaying them.

## Official Documentation

- [RxJS `retry`](https://rxjs.dev/api/index/function/retry)
- [RxJS `RetryConfig`](https://rxjs.dev/api/operators/RetryConfig)
- [RxJS `repeat`](https://rxjs.dev/api/index/function/repeat)
- [RxJS `concatMap`](https://rxjs.dev/api/operators/concatMap)
- [RxJS higher-order Observables guide](https://rxjs.dev/guide/higher-order-observables)
- [RxJS `retryWhen` deprecation](https://rxjs.dev/api/index/function/retryWhen)
- [RxJS `repeatWhen` deprecation](https://rxjs.dev/api/index/function/repeatWhen)

## Conclusion

Drive a poll from completion, not from an independent timer. A cold request wrapped by `retry({ delay })` and then `repeat({ delay })` gives each poll one retry budget, prevents overlap, and makes cancellation and terminal failure behavior explicit.
