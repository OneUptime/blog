# Choose Fixed, Linear, or Exponential Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Rate Limiting, Lock Contention, Polling, Retries, Jitter

Description: Match fixed, linear, or exponential delays to the recovery mechanism, then add jitter, server guidance, deadlines, and retry budgets where needed.

---

Backoff is a feedback policy. The right shape depends on what makes the next attempt more likely to succeed. A stable polling cadence, short-lived lock contention, an explicit rate-limit reset, and a regional outage have different recovery signals. Applying exponential backoff to all four can create unnecessary latency or persistent load.

Start with the failure mechanism and the server contract. Then choose the simplest bounded schedule that fits it.

## Compare the Delay Shapes

Let <code>n</code> be the retry number starting at zero:

~~~text
fixed:       delay(n) = interval
linear:      delay(n) = min(cap, initial + n * step)
exponential: delay(n) = min(cap, initial * multiplier^n)
~~~

Use overflow-safe arithmetic before applying the cap. Apply a documented jitter algorithm after computing the raw local delay, unless a trusted server has supplied authoritative retry timing that the protocol says to use directly.

| Pattern | Strength | Risk | Typical fit |
| --- | --- | --- | --- |
| fixed | predictable cadence and simple capacity math | synchronizes callers and does not react to repeated failure | normal polling, protocol-defined interval |
| linear | increases caution without rapid growth | can still offer too much load during a broad outage | bounded local contention with a roughly known recovery window |
| exponential | rapidly reduces repeat load during uncertain recovery | later attempts become slow and the cap becomes a fixed fleet cadence | transient network or service failures |

The examples are starting points, not rules. Evidence from the target API overrides a generic category.

## Use Fixed Delay for Normal Polling

Polling is scheduled observation, not necessarily failure recovery. If a job checks status every five seconds while the operation remains legitimately pending, a fixed interval expresses the product requirement clearly.

Add initial phase randomization or per-cycle jitter when many pollers start together:

~~~text
next poll = nominal interval + bounded symmetric jitter
~~~

Do not let symmetric jitter produce a negative wait. If the server returns a next-poll time, cursor, long-poll endpoint, watch stream, or webhook, prefer that contract to blind polling.

After a polling transport failure, an exponential failure streak can run *around* the normal cadence:

~~~text
successful poll -> reset failure streak -> normal fixed interval
failed poll     -> exponential retry delay within operation deadline
~~~

This keeps ordinary pending results from being treated as errors.

## Treat Rate Limits as Server-Controlled Capacity

For <code>429 Too Many Requests</code>, a valid <code>Retry-After</code> or API-specific reset signal is better than guessing fixed, linear, or exponential timing. The limit may be per user, resource, region, or method, so scope client rate state to the documented dimension.

When guidance is absent:

- stop increasing the arrival rate;
- use bounded exponential backoff with jitter for rejected attempts;
- apply a client-side rate limiter to first attempts, not only retries;
- enforce retry tokens so a fleet cannot sustain rejected traffic;
- honor the operation deadline.

Fixed-delay retry is risky because every limited client can return at the same interval. Exponential delay alone also does not enforce a steady permitted rate once calls recover; a rate limiter is the appropriate long-lived control.

## Keep Lock-Contention Retries Short and Local

For an optimistic compare-and-swap conflict, do not merely wait and resubmit stale state. Re-read, recompute, and retry the conditional update. Delay reduces immediate collision, while the new version makes the operation valid.

For short local mutex or database lock contention, a small randomized fixed or linear delay can be reasonable when:

- the critical section has a measured bounded duration;
- the transaction or lock operation is safe to repeat;
- the server does not already queue waiters fairly;
- the retry count and elapsed time are tightly bounded.

Exponential backoff fits when repeated contention suggests overload rather than one short collision. Deadlock victims generally need the complete transaction recreated before retry; sleeping and reusing the aborted transaction is incorrect.

Be careful with fairness. Random contenders can repeatedly beat an older waiter. A server-side queue or lock manager with fair waiting may be better than client retries.

## Use Exponential Backoff for Uncertain Outages

When recovery time is unknown, exponential growth quickly removes repeat pressure:

~~~text
raw delays with initial 200 ms and multiplier 2:
200 ms, 400 ms, 800 ms, 1.6 s, 3.2 s, then cap
~~~

Use full or another documented jitter strategy so clients do not follow identical schedules. A cap prevents one delay from becoming unusably long, but every caller eventually reaches a fixed capped cadence. Add retry tokens, concurrency limits, or a circuit breaker to control aggregate load during a prolonged outage.

The initial delay should relate to how quickly the transient condition can plausibly clear. The cap should fit the caller's overall deadline and recovery objective. A multiplier of two is common, not mandatory.

## Do Not Back Off Permanent Errors

No delay shape fixes:

- invalid input or failed authentication;
- unsupported methods or versions;
- a state conflict that requires new data;
- an unsafe operation with unknown outcome;
- a quota that requires administrative action;
- a missing resource that is not expected to appear.

Classify first. Backoff is scheduling for an eligible retry, not a substitute for understanding the failure.

## Combine the Pattern with Stop Conditions

Every schedule needs:

- a maximum total attempt count;
- a maximum elapsed deadline;
- cancellation-aware waits;
- a minimum useful time for the next attempt;
- an operation replay-safety decision;
- bounded server-delay handling;
- telemetry for attempts, delays, exhaustion, and final outcomes.

For asynchronous jobs, maximum age can matter more than a synchronous deadline. Persist <code>first_seen_at</code> and attempt count across restarts so redeployment does not reset every failed job to its fastest delay.

## Validate with Real Recovery Curves

Measure retry success probability by failure class, attempt number, and elapsed time since the first failure. If most successes occur within 100 milliseconds, a five-second initial delay wastes availability. If later attempts almost never succeed during an outage, more attempts merely add load and latency.

Run fleet simulations. A schedule that is gentle for one caller can still be aggressive across thousands of replicas. Include simultaneous restart, shared rate limiting, long outage, and gradual recovery cases.

## Official Documentation

- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [Google Cloud Storage retry strategy](https://docs.cloud.google.com/storage/docs/retry-strategy)
- [gRPC connection backoff protocol](https://github.com/grpc/grpc/blob/master/doc/connection-backoff.md)
- [Kubernetes wait and backoff utilities](https://pkg.go.dev/k8s.io/apimachinery/pkg/util/wait)

## Conclusion

Use fixed cadence for normal polling, short randomized fixed or linear delays for measured local contention, and capped exponential backoff with jitter for uncertain transient failure. Rate limits should follow server guidance and rate control. Whatever the curve, bound it with replay safety, deadlines, retry budgets, and measured recovery data.
