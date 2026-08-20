# Ramp Traffic Up Gradually After an Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Resilience, Traffic Management, Backoff, Rate Limiting, Recovery, Jitter

Description: Protect a recovering dependency with jittered retries, a shared admission gate, and a success-driven traffic ramp.

---

Backoff protects a dependency while it is failing, but recovery creates a second hazard. Thousands of clients can see the first healthy response, reset their backoff, and release queued work at once. The recovering service falls over again.

Treat recovery as a capacity-discovery phase, not a binary switch from zero to full traffic.

## Add an Admission Gate Above Individual Retries

Every attempt, including first attempts and retries, should pass through two independent controls:

- A concurrency limit bounds simultaneous in-flight work.
- A rate limit bounds how quickly new attempts begin.

A token bucket is a common rate gate. Its refill rate controls sustained admission, while its capacity controls the permitted burst. During an outage, lower its refill rate, keep the burst capacity small or drain stored tokens, and prevent an unlimited backlog. After credible success, increase the refill rate in measured steps.

```text
on overload or timeout:
    sending_rate = max(min_rate, sending_rate * 0.5)
    success_windows = 0

on a complete healthy window:
    success_windows += 1
    sending_rate = min(normal_rate, sending_rate + ramp_step)

before every attempt:
    acquire concurrency permit
    try:
        acquire rate token immediately before sending
        send one bounded attempt
    finally:
        release concurrency permit
```

This is an additive-increase, multiplicative-decrease sketch, not a universal tuning formula. Choose windows and thresholds from the dependency's latency, capacity, and error budget.

## Keep Jitter During the Ramp

Do not remove per-request jitter when the circuit or health check turns green. The gate limits aggregate admission, while jitter reduces synchronized contention among clients waiting for tokens.

The AWS SDK standard retry mode combines exponential backoff with full jitter and a retry token bucket. Its adaptive mode adds a client-side rate limiter that reacts to throttling. AWS cautions that adaptive clients should be scoped to the resource that shares a throttle dimension; otherwise one unhealthy resource can slow unrelated requests. As of August 2026, AWS says supported SDK and tool releases require opting in to the behavior described in its current cross-SDK guide with `AWS_NEW_RETRIES_2026=true`; without it, they retain pre-2026 behavior that differs in backoff timing, retry quota costs, and service-specific defaults.

Apply the same scoping principle to a custom recovery gate. A rate limit for one database shard, tenant, region, or API quota should not suppress healthy resources unless they truly share capacity.

## Probe Before Releasing the Backlog

Use a small number of real, representative requests as probes. A lightweight health endpoint can be green while the expensive data path remains overloaded.

Increase traffic only after a complete observation window meets criteria such as:

- success rate above the target;
- latency below a recovery threshold;
- no throttling or overload signals;
- downstream queue depth decreasing;
- enough samples to avoid reacting to one lucky request.

On renewed overload, reduce admission immediately and resume backoff. Add hysteresis so one success does not open the gate and one isolated application error does not close it.

## Bound and Classify the Backlog

A six-minute outage can accumulate more work than the dependency can ever catch up on. Set maximum queue age and size, coalesce replaceable refreshes, and discard obsolete polling requests. Preserve durable business work, but process it through the same recovery rate.

Separate traffic classes. Interactive requests may need a reserved lane while bulk retries consume spare capacity. Within each class, enforce per-tenant limits so one large backlog cannot monopolize recovery.

Only retry operations that are safe to repeat, and do so at one deliberate layer. If a proxy, SDK, service, and worker each retry independently, the multiplicative attempt count can overwhelm any ramp controller.

## Coordinate Fleet-Wide Capacity

A rate limiter inside each pod limits only that pod. If 1,000 pods each ramp to 10 requests per second, aggregate load is 10,000 requests per second. Either divide a known global budget across instances, use a shared limiter, or let the downstream service advertise and enforce capacity.

Server signals such as `Retry-After` should influence admission. Validate the value and do not retry before its indicated time; if it exceeds a local waiting limit, fail or defer the work instead. When the contract does not already disperse clients, add only non-negative jitter after the indicated delay.

Deploy recovery logic under load tests that simulate synchronized failures and restarts. Watch admitted rate, concurrency, retry ratio, queue age, rejection rate, and dependency saturation throughout the ramp.

## Official Documentation

- [AWS SDK retry behavior, token buckets, and adaptive mode](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS Well-Architected guidance for limiting retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)
- [RFC 9110 `Retry-After`](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)

## Conclusion

Recovery needs its own control loop. Keep jitter, meter all attempts through scoped rate and concurrency gates, increase admission only after sustained success, and shed or isolate backlog that would destabilize the recovering service.
