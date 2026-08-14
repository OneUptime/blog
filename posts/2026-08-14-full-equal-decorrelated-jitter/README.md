# Full Jitter, Equal Jitter, or Decorrelated Jitter?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Exponential Backoff, Jitter, Retries, Distributed System, Resilience, Client Design

Description: Compare three jitter algorithms, their delay distributions and state requirements, and choose a retry strategy that avoids synchronized client bursts.

---

Use full jitter as the default for a custom distributed-client retry loop unless a proven library or protocol specifies another strategy. It spreads every retry across the complete exponential window, is stateless apart from the retry index, and performed well in AWS's published contention simulation.

Equal jitter preserves at least half of the exponential delay, which sounds conservative but can keep clients unnecessarily synchronized and delayed. Decorrelated jitter uses the previous sleep to vary the next range; it can reduce completion time in some workloads at the cost of more client work, more state, and a less predictable sequence. These are tradeoffs, not universal rankings for every service.

Before implementing any of them, check the official SDK. AWS and Google Cloud client libraries already implement documented retry behavior for many service calls. Replacing it can create nested retries or discard service-specific error classification and retry quotas.

## Start With a Capped Exponential Window

Define terms precisely. Let retry index `n = 0` mean the first retry after the initial failed attempt:

```text
window(n) = min(cap, initial * multiplier^n)
```

With `initial = 100 ms`, `multiplier = 2`, and `cap = 10 s`, the unjittered windows are 100 ms, 200 ms, 400 ms, and so on until 10 seconds.

Sleeping for exactly each window does reduce the request rate, but every client that failed at roughly the same time follows the same clock. A deployment, dependency outage, rate-limit window, or network recovery can therefore produce synchronized retry waves. Jitter chooses a random point in or around each window to spread that work.

The retryable error set, idempotency, per-attempt timeout, overall deadline, and maximum attempts are separate decisions. Randomizing a retry does not make an unsafe operation safe.

## Full Jitter

Full jitter selects uniformly from zero through the current window:

```text
sleep(n) = uniform(0, window(n))
```

Its expected sleep is half the unjittered window. Very short sleeps are possible, including values near zero, but a large population spreads across the entire interval rather than aligning at one boundary.

Properties:

- simple and stateless apart from retry index;
- maximum delay is bounded by the current window and cap;
- expected delays are lower than the unjittered schedule;
- good population-level spreading when random sources are independent;
- individual sequences can contain a short later sleep after a longer earlier sleep.

AWS's current cross-SDK retry documentation describes full jitter for its updated standard behavior. That behavior currently requires the documented `AWS_NEW_RETRIES_2026=true` opt-in until it becomes the default, and support details vary by SDK and service. Prefer the SDK's documented mode when calling AWS rather than duplicating this formula around it.

## Equal Jitter

Equal jitter keeps half of the window and randomizes the other half:

```text
half = window(n) / 2
sleep(n) = half + uniform(0, half)
```

The sleep is always between half and all of the window, with an expected value of three quarters of the window. It prevents near-zero delays, but narrows the population into the latter half of every interval.

Properties:

- stateless apart from retry index;
- guarantees a minimum delay that grows with the window;
- performs less spreading than full jitter at a given exponential window;
- adds more expected latency than full jitter;
- can still produce visible bands when many clients share the same schedule.

In AWS's published optimistic-concurrency simulation, equal jitter took longer than full jitter while doing slightly more work. That simulation is evidence against choosing equal jitter by intuition alone, not a theorem about every workload. If a protocol requires a minimum quiet period, encode that explicit minimum or honor its server hint rather than assuming equal jitter is the only way to provide it.

## Decorrelated Jitter

A commonly cited decorrelated variant uses the previous sleep to choose the next one:

```text
previous = initial
sleep(n) = min(cap, uniform(initial, previous * 3))
previous = sleep(n)
```

Here `n = 0` is the first retry, so its range is `initial` through `3 * initial` before applying the cap. Published implementations differ in how they clamp the upper bound, seed the previous value, and handle a bound below `initial`. Record the exact variant in tests instead of using the name alone.

Compute `previous * 3` with saturating arithmetic before passing the upper bound to a random-number API. Clamping only after an overflowing multiplication can produce an invalid or unexpectedly short delay.

Unlike capped exponential schedules, a short random result can reduce the next upper bound. A longer result expands it again. The sequence wanders and is less tied to shared retry indexes.

Properties:

- depends on the previous chosen delay;
- naturally breaks alignment between clients over successive retries;
- can remain high or drop after a high delay;
- has less obvious cumulative-delay bounds than a fixed window sequence;
- needs per-operation state and careful reset after success;
- in AWS's simulation, completed slightly faster than full jitter but performed more work.

Decorrelated jitter can fit long-lived reconnect or contention loops where the wandering schedule has measured benefits. It is harder to reason about under a strict request deadline and easier to implement inconsistently across languages.

## Compare the Distributions, Not One Sample

One random run cannot show whether jitter works. For a fixed retry index, generate many samples and verify range, mean, and distribution. With a one-second window:

| Strategy | Range | Expected sleep |
| --- | --- | --- |
| No jitter | exactly 1 s | 1 s |
| Full jitter | 0 to 1 s | 0.5 s |
| Equal jitter | 0.5 to 1 s | 0.75 s |
| Decorrelated | depends on previous sleep | depends on state |

Endpoint inclusion depends on the random-number API and is not operationally important at normal timer resolution, but tests should match the implementation.

Population behavior matters more than the average of one client. Simulate the actual fleet size, outage start pattern, attempt time, cap, and deadline. Plot requests per time bucket. A good strategy lowers peak synchronized load while maintaining acceptable completion and abandonment rates.

## Implement the Window Without Overflow

Do not calculate `initial * multiplier^n` in an unchecked integer type. A long-lived worker or corrupted retry index can overflow before `min` sees the value. Grow iteratively and clamp before multiplication:

```go
func cappedWindow(initial, cap time.Duration, multiplier uint64, n uint) time.Duration {
	if initial <= 0 || cap <= 0 {
		return 0
	}
	if initial >= cap {
		return cap
	}
	if multiplier < 1 {
		multiplier = 1
	}
	if multiplier == 1 {
		return initial
	}

	window := initial
	for i := uint(0); i < n; i++ {
		if multiplier > uint64(cap/window) {
			return cap
		}
		window *= time.Duration(multiplier)
	}
	if window > cap {
		return cap
	}
	return window
}
```

This helper assumes positive durations and an integer multiplier for clarity. A production library must define validation for every configurable value. Use a well-reviewed retry library when possible.

For full jitter, choose a duration uniformly within the returned window using an injected random source. Do not use a cryptographic generator unless the threat model requires unpredictability, but do ensure that processes do not all restart with the same deterministic seed. Identically seeded clients recreate synchronization despite a correct formula.

## Respect Cancellation and Deadlines

A retry sleep must be cancelable. Never call a blocking sleep that outlives the request context or shutdown signal. Before sleeping, compare the chosen delay plus a realistic next-attempt budget with the remaining overall deadline. If the attempt cannot finish, return the final classified error rather than waking only to time out.

When a valid `Retry-After` or protocol-specific pushback value applies, do not retry earlier than the server requests. Combine server guidance with local jitter and the caller's deadline deliberately; the next post in this series covers that policy in detail.

Cap limits one delay, not total elapsed time. A client that stays at the cap forever still sends traffic forever. Pair backoff with maximum attempts, maximum elapsed time, retry quotas or tokens, and circuit breaking where the library supports them.

## Choose by Workload

Use this decision order:

1. **Service SDK already has documented retries:** use and configure it; prevent an outer loop from multiplying attempts.
2. **Custom request loop with many independent clients:** start with capped exponential full jitter.
3. **Protocol has a minimum server-directed delay:** honor that minimum, optionally adding only nonnegative jitter within the caller's budget.
4. **Long-lived reconnect or high-contention loop:** evaluate decorrelated jitter with a workload simulation and explicit reset semantics.
5. **Considering equal jitter only to avoid short sleeps:** first examine whether the initial window or retry classification is too aggressive.

Do not switch algorithms to compensate for retrying permanent errors, missing rate limits, or an undersized dependency. Backoff is load shaping, not capacity creation.

## Test Jitter Deterministically

Inject three dependencies: random-number source, monotonic clock, and cancelable sleeper. Unit tests can then supply a known sequence and virtual time.

Verify:

- every full-jitter value stays in its current window;
- every equal-jitter value stays in the upper half;
- decorrelated bounds use the previous selected value and reset on success;
- cap arithmetic cannot overflow;
- cancellation interrupts waiting;
- the loop refuses an attempt that cannot fit the deadline;
- retryable and non-retryable errors take different paths;
- many simulated clients do not share identical seeds.

Use statistical tests only for large-sample distribution properties and give them tolerant, non-flaky bounds. Exact unit tests should drive the injected random sequence.

## Official Documentation

- [AWS Architecture Blog on exponential backoff and jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Amazon Builders Library on timeouts, retries, and jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS Well-Architected guidance for limiting retries](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [Google Cloud Storage retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [Go time package](https://pkg.go.dev/time)

## Conclusion

Full jitter is a strong default because it spreads clients across the whole capped exponential window with little state or complexity. Equal jitter delays every retry into the latter half and needs evidence to justify that tradeoff. Decorrelated jitter can improve some long-lived or contentious workloads but adds state and less predictable timing. Whichever strategy you choose, bound attempts and elapsed time, honor cancellation, and test the fleet distribution rather than one random sequence.
