# Stop Capped Backoff from Hammering Services with Retry Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Exponential Backoff, Retry Budget, Token Bucket, Load Shedding, Circuit Breaker, Reliability

Description: Add a success-replenished retry-token budget to capped backoff so sustained failures shed repeat traffic before a dependency outage gets worse.

---

Capping exponential backoff stops the backoff interval from growing indefinitely. It does not limit how many callers retry. Once every failing operation is in the capped regime, the population can continue at a steady expected rate:

~~~text
steady retry rate per caller is approximately 1 / (mean post-jitter delay at the cap + mean attempt duration)
fleet retry rate is approximately failing callers / (mean post-jitter delay at the cap + mean attempt duration)
~~~

Ten thousand active operations whose post-jitter delays average 10 seconds at the cap, with short attempt durations, can still offer roughly one thousand retries per second. New initial requests add more load. A sick service can remain trapped under traffic that exists only because earlier traffic failed.

A retry-token budget makes retries conditional on recent health. Backoff answers *when* an eligible retry may run. Tokens answer *whether* the system can afford that retry at all.

## Separate Initial Traffic from Retry Traffic

Keep the initial request path and retry path conceptually distinct:

1. An operation sends its initial attempt, subject to normal admission and concurrency limits.
2. A retryable failure occurs.
3. The client checks its attempt and deadline limits.
4. The client must acquire a retry token.
5. It waits for jittered backoff, then sends the retry.
6. Successful traffic gradually replenishes the retry budget.

When tokens are depleted, return the current failure immediately. Do not wait for a token unless the design deliberately treats the token bucket as a queue; waiting can hide a dependency outage behind long caller latency.

AWS SDK standard retry behavior is a production example of this idea. Its retry quota deducts tokens for retry attempts and replenishes tokens on successful requests. When the quota is empty, the SDK fails without another retry. Exact costs and defaults are SDK and version specific, so use the current documentation for the deployed client rather than copying constants. As of August 2026, AWS marks its documented 2026 cross-SDK behavior as opt-in in SDK versions that support the flag through <code>AWS_NEW_RETRIES_2026=true</code> until it becomes the default; without that setting, pre-2026 behavior applies.

## Design the Token Economy

A simple local model is:

~~~text
capacity = 100 tokens
retry cost = 5 tokens
first-attempt success refill = 1 token
successful-retry refill = policy-defined amount
~~~

Those values are illustrative, not universal recommendations. The useful properties are:

- the bucket absorbs a short transient burst;
- sustained failures spend tokens faster than successes restore them;
- healthy traffic eventually restores retry capacity;
- the bucket has a hard maximum;
- retry acquisition is atomic under concurrency.

Different failure classes can have different costs. A throttling response might plausibly recover after server-directed delay, while connection failures across an entire region can indicate a broad outage. Higher token cost for failures with a low observed recovery rate drains the budget sooner. Base that distinction on measured outcomes and documented service signals.

## Implement a Non-queuing Retry Gate

The token store can be local to a process when each client instance should protect its own offered load:

~~~go
type RetryBudget struct {
	mu       sync.Mutex
	tokens   int
	capacity int
}

func NewRetryBudget(capacity int) *RetryBudget {
	if capacity <= 0 {
		return &RetryBudget{}
	}
	return &RetryBudget{
		tokens:   capacity,
		capacity: capacity,
	}
}

func (b *RetryBudget) TrySpend(cost int) bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	if cost <= 0 || b.tokens < cost {
		return false
	}
	b.tokens -= cost
	return true
}

func (b *RetryBudget) Refill(amount int) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if amount <= 0 {
		return
	}
	if b.tokens >= b.capacity || amount >= b.capacity-b.tokens {
		b.tokens = b.capacity
		return
	}
	b.tokens += amount
}
~~~

The constructor starts a positive-capacity bucket full; a nonpositive capacity disables retries. Initialize through it so the bucket begins within its required bounds. <code>TrySpend</code> never waits for tokens to be replenished, although it can briefly wait for the mutex under contention.

The flow above treats acquisition as a reservation before backoff. If cancellation wins before the retry is sent, refund the reservation exactly once. Alternatively, spending only after backoff avoids refunds but lets many callers enter backoff and discover when they wake that no token remains. Whichever rule you choose, make the reservation-to-sent or reservation-to-refunded transition atomic and test cancellation races.

Do not refill merely because time passed unless you explicitly want a rate limiter rather than a health-sensitive retry quota. A clock-refilled token bucket permits retries throughout a complete outage. Success-based replenishment couples retry capacity to evidence that attempts are working again.

## Scope the Budget to the Failure Domain

One global bucket can let a failing optional dependency consume retry capacity needed for a healthy critical dependency. One bucket per individual request provides no fleet protection. Choose a scope that matches shared fate, such as:

~~~text
destination service + region + API resource or throttling dimension
~~~

Avoid unbounded bucket cardinality. Expire idle buckets and cap the number retained. For multi-tenant callers, use hierarchical budgets: a global dependency bucket provides a safety ceiling, while tenant buckets keep one noisy tenant from spending every retry token.

AWS adaptive retry guidance illustrates the scoping risk. Its client-side rate limiter operates per client instance, so one client used across multiple resources or tenants can slow unaffected traffic after one resource is throttled. Partition clients or limiter state by the documented throttling resource when using such a mode.

## Combine Tokens with Other Controls

Retry tokens are not a replacement for:

- **jittered backoff**, which disperses the retries that are allowed;
- **an overall deadline**, which bounds how long the caller waits for a useful result;
- **an attempt cap**, which bounds the number of attempts for one logical operation;
- **a concurrency limit**, which bounds in-flight load;
- **a circuit breaker**, which can reject calls while a dependency is broadly unhealthy;
- **server-directed delay**, which communicates resource-specific recovery timing.

A concurrency limit is especially important after recovery. Token capacity can refill while many operations are waiting; releasing all of them at once can create another spike. Admit recovery traffic gradually.

## Measure Whether the Budget Is Protecting You

Record:

- initial attempts and retry attempts separately;
- retry tokens available as a gauge;
- tokens spent by failure class and replenished by success or attempt class;
- retries rejected because the budget was empty;
- retry success probability by attempt number;
- total retry delay and final operation outcome;
- dependency concurrency and offered request rate.

An increasing initial failure rate, falling token balance, and rising budget rejections show the gate working. If backend load remains high after retry rejection, initial traffic needs admission control or load shedding too.

Do not label token metrics by raw URL, request ID, or exception text. Use a bounded dependency, region, operation class, and tenant tier.

## Test Burst, Outage, and Recovery

A deterministic simulation should demonstrate:

1. a small transient burst succeeds using reserved tokens;
2. a sustained outage drains the bucket and suppresses retries;
3. initial attempts continue or shed according to a separate admission policy;
4. successes restore tokens no faster than intended;
5. many concurrent callers cannot overspend the bucket;
6. cancellation does not leak or duplicate tokens;
7. recovery traffic respects a concurrency or ramp-up limit.

Load-test with the real number of client processes. A process-local bucket multiplied across thousands of pods can still allow a large absolute retry burst, so capacity must be evaluated at fleet scale.

## Official Documentation

- [AWS SDK retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [gRPC retry guide and retry throttling](https://grpc.io/docs/guides/retry/)
- [AWS circuit breaker pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html)

## Conclusion

Capped backoff eventually enters a steady retry-rate regime, and a large fleet can sustain damaging load in that regime. Put a success-replenished token gate in front of retries, scope it to the dependency failure domain, and combine it with deadlines, jitter, concurrency limits, and gradual recovery admission.
