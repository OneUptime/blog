# Budget Per-Attempt Timeouts Within One Overall Retry Deadline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retries, Timeout, Deadlines, Backoff, gRPC, Go

Description: Keep retries inside one caller deadline by charging every attempt and backoff delay to the same budget and refusing work that cannot finish in time.

---

A per-attempt timeout bounds one network call. An overall deadline bounds the complete logical operation, including DNS, connection setup, every request, response-body processing, and every backoff sleep. They solve different problems and must be enforced together.

Both are cooperative bounds: every transport and local processing step must honor cancellation because a deadline cannot preempt arbitrary computation.

Without an overall deadline, three 10-second attempts plus two sleeps can turn a 10-second expectation into a 35-second response. Without a per-attempt timeout, the first hung request can consume the entire operation budget and leave no opportunity for a useful retry.

## Define the Time Budget at the Entry Point

The caller knows when the result stops being useful. Establish that deadline once and propagate it through the complete call chain. Do not create a fresh overall timeout inside each retry attempt.

For an operation with absolute deadline <code>D</code>, the remaining budget before each decision is:

~~~text
remaining = time_until(D)
~~~

Within one process, use a monotonic clock for this calculation when the deadline representation supports it. In Go, <code>time.Until</code> uses a monotonic reading when the <code>time.Time</code> carries one and otherwise falls back to wall-clock time.

Backoff is not free time. If a retry sleeps for 400 milliseconds, the operation has 400 milliseconds less in which to complete.

The rough worst-case bound is:

~~~text
total <= sum(attempt durations) + sum(backoff delays) + local overhead
~~~

The deadline is the authoritative bound because actual attempts may finish early and cancellation can interrupt a sleep.

## Reserve Enough Time for a Meaningful Attempt

Before scheduling another try:

1. Read the remaining deadline budget.
2. Compute the candidate backoff, including server guidance and jitter.
3. Stop if the delay leaves less than a configured minimum useful attempt time.
4. Sleep in a cancellation-aware way.
5. Derive an attempt timeout no later than the overall deadline.

A practical calculation is:

~~~text
attempt_budget = min(configured_per_attempt, remaining_after_sleep - finish_reserve)
~~~

The finish reserve leaves time for cleanup, bookkeeping, and returning the result after an attempt. Response-body reading and decoding performed by <code>send</code> must fit within <code>attempt_budget</code>. The reserve should be measured rather than made arbitrarily large. If <code>attempt_budget</code> is below the minimum time in which this dependency can plausibly respond, fail immediately with a deadline-budget reason.

Do not force every attempt to have equal time. Later attempts naturally receive less when earlier work and sleeps consumed the shared budget. If a specific API needs a minimum service time, reduce the attempt count or initial delays instead of exceeding the caller deadline.

## Implement Nested Contexts in Go

Go request contexts control the lifetime of an outgoing HTTP request, including obtaining a connection, sending the request, and reading its response headers and body. Derive each attempt from the original operation context:

~~~go
var errInsufficientDeadlineBudget = errors.New("insufficient deadline budget for a useful attempt")

func runAttempt(
	ctx context.Context,
	maxAttempt time.Duration,
	minAttempt time.Duration,
	finishReserve time.Duration,
	send func(context.Context) error,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	deadline, ok := ctx.Deadline()
	if !ok {
		return errors.New("overall deadline is required")
	}

	remaining := time.Until(deadline)
	if remaining <= 0 {
		return context.DeadlineExceeded
	}

	available := remaining - finishReserve
	if available <= 0 {
		return errInsufficientDeadlineBudget
	}

	budget := maxAttempt
	if available < budget {
		budget = available
	}
	if budget < minAttempt {
		return errInsufficientDeadlineBudget
	}
	attemptCtx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()

	return send(attemptCtx)
}
~~~

The parent context wins when it expires first. Always call the returned cancel function so timer resources are released promptly. Pass the attempt context to the transport and to response processing performed by <code>send</code>; all of that work must fit within the same attempt boundary.

If response headers need a tighter limit than the complete attempt, configure <code>http.Transport.ResponseHeaderTimeout</code> carefully, but keep the request context deadline as the outer bound. <code>ResponseHeaderTimeout</code> does not include time spent reading the response body, and a connection timeout does not bound application processing.

## Make Backoff Part of the Same Control Flow

An ordinary blocking sleep ignores cancellation until the delay ends. Wait on both a timer and the parent context:

~~~go
func waitForRetry(ctx context.Context, delay time.Duration) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	if delay <= 0 {
		return nil
	}

	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-timer.C:
		return ctx.Err()
	case <-ctx.Done():
		return ctx.Err()
	}
}
~~~

Check the budget before creating the timer. A valid server-provided delay is still unusable when it extends beyond the operation deadline. Return immediately rather than sleeping until a retry that can never start.

## Propagate Deadlines Across Services

gRPC deadlines apply to the complete RPC from the application's point of view. A client should set a realistic deadline; servers should stop work after cancellation and propagate the remaining deadline to downstream RPCs. Where automatic deadline propagation is supported and enabled, gRPC converts the deadline to a timeout after deducting elapsed time, which avoids depending on perfectly synchronized clocks.

For an HTTP service chain, use the framework's supported deadline propagation rather than trusting an arbitrary end-user header. Each hop needs time for its own work and response path. A downstream deadline must not exceed the upstream request's remaining budget.

Retries hidden in an SDK or service mesh consume the same caller time even when the application cannot see their individual sleeps. Inventory those layers when calculating a service-level objective.

## Choose Values from Latency Data

Start with a user-facing or job-level objective, then work inward:

- reserve time for upstream work and the return path;
- choose a per-attempt timeout above normal tail latency but below the full operation budget;
- keep enough space for at least one useful retry only when retry success data justifies it;
- cap exponential backoff so it does not consume the entire deadline;
- include connection establishment and cold-start behavior in measurements.

Do not derive a timeout solely from the mean. Use latency distributions by operation and region. A timeout at an extremely tight percentile can create retries during ordinary tail latency and amplify load.

## Record Why the Loop Stopped

Distinguish these final outcomes:

- the current attempt reached its per-attempt timeout;
- the overall operation deadline expired;
- the next backoff would exceed the deadline;
- too little budget remained for a meaningful attempt;
- the maximum attempts or retry-token budget was exhausted;
- the caller canceled for another reason.

This separation reveals whether to tune an individual transport phase, reduce retry delays, remove an attempt, or adjust the end-to-end objective. A generic timeout counter hides the answer.

## Test with a Controllable Clock

Tests should simulate:

- an early success;
- attempts that consume their complete local timeout;
- a fast failure followed by a successful retry;
- cancellation during backoff;
- a server delay longer than remaining time;
- response processing that consumes the attempt budget and post-attempt work that uses the finish reserve;
- a parent deadline that expires before an attempt-local timeout.

Use a virtual-time facility that controls both <code>time</code> timers and context deadline timers, or inject all of those time dependencies, so tests advance virtual time instead of waiting. Assert that the retry loop refuses an attempt when the overall deadline is already exhausted at its budget check and that every attempt deadline is no later than its parent.

## Official Documentation

- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [Go context package documentation](https://pkg.go.dev/context)
- [Go net/http package documentation](https://pkg.go.dev/net/http)

## Conclusion

Set one overall deadline where the logical operation begins, propagate it everywhere, and debit both attempts and sleeps from that budget. Per-attempt timeouts keep one try from monopolizing the operation; remaining-time checks ensure a retry starts only when it still has a credible chance to finish.
