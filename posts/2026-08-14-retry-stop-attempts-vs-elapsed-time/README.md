# Should Retries Stop by Attempt Count or Elapsed Time?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retries, Exponential Backoff, Deadlines, Timeout, Distributed System, Resilience

Description: Combine a caller-aligned elapsed deadline with an attempt ceiling so retry loops bound latency, downstream load, and pathological fast failures.

---

Use both a maximum elapsed time and a maximum attempt count for most synchronous retry loops. The elapsed deadline protects the caller's latency contract when attempts and backoff take variable time. The attempt ceiling bounds downstream work when failures return immediately and consume almost no elapsed time.

For durable background work, the same limits should end one execution episode and reschedule the item rather than spin forever. The job's longer business deadline and delivery-attempt policy remain separate.

## Why Attempt Count Alone Is Not Enough

Three attempts can take radically different amounts of time:

```text
Case A: 20 ms failure + 30 ms sleep, repeated
Case B: 2 s timeout + 1 s sleep, repeated
Case C: valid Retry-After asks for 60 s before the next request
```

If a user-facing request has a five-second objective, a fixed three-attempt loop can violate it in cases B and C. A maximum elapsed deadline makes the caller contract explicit regardless of how attempt latency and server hints vary.

An attempt-count setting is also easy to misunderstand. Some libraries count retries after the initial request. AWS's shared-configuration `max_attempts` setting and `AWS_MAX_ATTEMPTS` environment variable count total attempts including the initial request, although language-specific in-code APIs can differ. Name metrics and configuration precisely:

```text
attempt 1 = initial request
attempt 2 = first retry
attempt 3 = second retry
```

Do not label `max_retries = 3` and assume every library will send three total requests.

## Why Elapsed Time Alone Is Not Enough

An elapsed-only loop can send thousands of calls inside a short deadline when failures are immediate or when a bug calculates zero delay. It can also hammer a local dependency with a fast deterministic error.

An attempt ceiling protects:

- the downstream request budget;
- client CPU, sockets, and connection pools;
- billing for per-call services;
- logs and traces from unbounded repetition;
- against unbounded duplicate attempts, without making a non-idempotent operation safe to retry;
- a faulty clock, timer, or backoff configuration.

AWS Well-Architected guidance recommends limiting retries with a maximum retry value or elapsed time. In practice, combining them provides two independent bounds.

## Add Per-Attempt Timeouts as a Third Boundary

An overall deadline without per-attempt timeouts can be ineffective if the transport or SDK does not observe cancellation promptly. Each attempt needs a connect and operation timeout appropriate to the dependency.

The three boundaries answer different questions:

| Boundary | Protects |
| --- | --- |
| Per-attempt timeout | One hung or slow call |
| Maximum attempts | Downstream work and fast-failure loops |
| Overall deadline | Caller latency and total retry episode |

The effective attempt timeout should not exceed the remaining overall budget. Before an attempt starts, reserve enough time to return a useful error and release resources.

gRPC's deadline guidance similarly treats a deadline as the point after which a client is unwilling to wait and notes that clients do not set one by default. Protocol and library defaults vary, so propagate the caller deadline through nested calls. Depending on the implementation, propagation may be automatic or require explicit enabling or handling.

## Check the Budget Before Sleeping and Before Calling

A correct loop evaluates the remaining budget twice:

```text
stop if deadline or cancellation fired
stop if minimum useful attempt plus return margin cannot fit deadline
set attempt timeout to min(configured timeout, remaining budget minus margin)
send initial attempt
while failure is retryable:
    stop if attempt ceiling reached
    compute candidate delay
    stop if delay plus minimum useful attempt plus return margin cannot fit deadline
    wait with cancellation
    stop if deadline or cancellation fired
    stop if minimum useful attempt plus return margin cannot fit deadline
    set attempt timeout to min(configured timeout, remaining budget minus margin)
    send next attempt
```

Use a monotonic clock for elapsed calculations. Wall-clock changes from NTP, administrator action, or daylight-saving rules must not extend or prematurely end the loop. Many language time APIs carry a monotonic component when durations are derived correctly; use the language's documented deadline and timer primitives.

Do not sleep until the deadline and then start an attempt with no useful time. Return the last classified failure plus a stop reason such as `deadline_before_next_attempt`.

## Derive the Limits From the Caller Contract

Start with the overall operation objective, not a global retry constant. Allocate the budget among:

- initial attempt;
- expected and worst-case retry sleeps;
- later attempts;
- serialization and response handling;
- a safety margin for cancellation and cleanup.

For a five-second API call, two retries with bounded attempts may fit. For a 200-millisecond internal call, one carefully chosen retry might be all that is useful. For a background reconciliation job, one process can retry for a minute before placing the item into a delayed queue for later work.

The attempt ceiling depends on load tolerance and success probability. Measure the conditional success rate of retry two, three, and later. If the fifth attempt almost never succeeds before the deadline, it adds load without availability.

Do not consume the caller's entire deadline in one dependency. A request handler may need time for other downstream calls and to return an error. Propagate a child deadline that fits within the parent's remaining budget.

## Treat Server Pushback as a Scheduling Decision

A valid `Retry-After` can exceed the local backoff cap or remaining deadline. The client should not retry earlier merely to satisfy its attempt target.

For a synchronous caller:

1. verify the response and operation are retryable;
2. parse the hint safely;
3. choose no earlier than the larger of local backoff and server delay;
4. if the next useful attempt cannot fit, stop and return the retry metadata.

For a durable worker, persist the next eligible time and release the worker rather than blocking it for minutes. The current execution episode ends even though the business operation remains scheduled.

An invalid or absent header falls back to local backoff. Never interpret invalid syntax as zero and immediately retry.

## Distinguish Interactive, Batch, and Durable Limits

### Interactive requests

The caller's deadline is authoritative. Use few attempts, per-attempt timeouts, and fast failure when the dependency cannot recover within the remaining budget. Return a stable error rather than hiding a deadline violation behind a generic retry-exhausted wrapper.

### Batch operations

The batch has an elapsed objective, but each item or partition may need its own attempt ceiling. A global retry of the whole batch can repeat successful items. Retry only failed idempotent units and preserve completed results.

### Queue workers

Limit attempts and elapsed time within one message delivery. On exhaustion, publish a delayed retry or update next-visible time according to the queue's supported semantics. Also enforce a maximum delivery count or business age that eventually sends poison work to a dead-letter path.

Do not hold a worker thread in a long sleep when the queue can schedule visibility efficiently. Waiting retries should not starve new work.

### Long-lived reconnect loops

A WebSocket or watch client may legitimately run for the process lifetime, but each reconnect episode still needs a cap, cancellation, and reset rule. Reset backoff only after a connection remains healthy long enough or reaches an application-defined success point; an immediate connect-close cycle should not return to the fastest retry forever.

## Prevent Multiplicative Attempts

If an application retries three times, a service mesh retries three times, and an SDK retries three times, one original operation can generate many downstream attempts. The exact number depends on where failures occur, but the amplification can be multiplicative.

Choose one retry owner when practical. If layers must retry, pass an overall deadline and attempt metadata, use small budgets at inner layers, and observe total downstream attempts per original request. A maximum at each layer does not by itself bound the entire call graph tightly enough.

AWS Well-Architected guidance warns against retries at multiple application layers for this reason. The AWS SDK `standard` retry mode also uses a retry quota so a client normally stops retrying when its retry tokens are exhausted.

## Preserve the Final Failure and Stop Reason

Do not return only `maximum retries exceeded`. The caller needs the last meaningful dependency error and why the loop stopped.

A useful final error includes safe structured fields:

```text
operation: object.read
total_attempts: 3
elapsed_ms: 1842
last_error_class: unavailable
stop_reason: overall_deadline
last_server_retry_after_ms: 2000
```

Avoid embedding secrets, full URLs with credentials, request bodies, or every raw response. Keep an attempt history in trace events when needed and prevent every layer from logging the same failure as a new error.

Distinguish stop reasons such as non-retryable, attempt limit, elapsed deadline, caller cancellation, retry quota exhausted, and insufficient time for next attempt.

## Test With Virtual Time

Inject a monotonic clock and cancelable sleeper. Tests should cover:

- immediate retryable failures stop at the attempt ceiling;
- slow attempts stop at the elapsed deadline first;
- cancellation interrupts a backoff wait;
- the next attempt is skipped when its minimum budget cannot fit;
- a long valid server hint causes stop or durable reschedule;
- success on the final allowed attempt returns success;
- a terminal error never sleeps;
- attempt counters include or exclude the initial call exactly as documented;
- arithmetic near duration limits cannot overflow.

Use deterministic random values for jitter unit tests. Load-test the aggregate retry policy separately to validate downstream traffic.

## Official Documentation

- [AWS Well-Architected guidance for limiting retries](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [AWS SDK retry behavior and max attempts](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [Amazon Builders Library on timeouts, retries, and jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Google Cloud Storage retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [RFC 9110 Retry-After semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)
- [Go context package](https://pkg.go.dev/context)
- [Go time package](https://pkg.go.dev/time)

## Conclusion

An elapsed deadline protects the caller, while an attempt ceiling protects the dependency and the client during fast failures. Add a per-attempt timeout, cancellation, and a budget check before every sleep and call. For durable work, exhaustion ends one execution episode and reschedules safely; it should never mean spinning in a worker until the dependency returns.
