# Make Backoff Sleep Respect Cancellation and Deadlines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Cancellation, Deadlines, Graceful Shutdown, Go, Retries

Description: Replace unconditional backoff sleeps with cancellation-aware waits that stop promptly on caller deadlines, shutdown, and abandoned work.

---

A retry loop can classify errors perfectly and still behave badly during cancellation. An unconditional sleep waits until its delay ends even when the caller disconnected, the job was canceled, or the process began graceful shutdown. Long capped delays then keep goroutines, tasks, memory, and retry state alive for results nobody needs.

Backoff must be an interruptible wait attached to the same cancellation signal and deadline as the logical operation.

## Pass Cancellation into the Retry Function

Cancellation should flow from the operation's entry point:

~~~text
incoming request or job
  -> logical operation context
    -> backoff wait
    -> attempt context
      -> HTTP, RPC, database, or queue call
~~~

Do not create a background context inside a retry helper. Doing so detaches both the sleep and later attempts from caller cancellation. In Go, accept <code>context.Context</code> as the first parameter and derive any per-attempt timeout from it.

The same rule applies in other runtimes: use an abort signal, cancellation token, coroutine job, or task context that is already associated with the request.

## Wait on a Timer and Cancellation Together

A reusable Go helper is:

~~~go
func waitBackoff(ctx context.Context, delay time.Duration) error {
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

This creates a new timer for one wait and does not reuse or reset it, avoiding version-sensitive timer-reset complexity. <code>Stop</code> prevents an unneeded active timer after cancellation. Current Go timer semantics are documented by the <code>time</code> package. From Go 1.23 through Go 1.26, compatibility behavior can also depend on the main module's <code>go</code> directive and <code>GODEBUG=asynctimerchan</code>; consult those settings when maintaining timer-reuse code.

The timer branch checks cancellation again before returning. Cancellation and timer readiness can occur nearly together, and the final <code>ctx.Err()</code> check makes the preference to stop explicit. The next attempt must still use the same context because cancellation can occur after any standalone check.

## Refuse Sleeps That Outlive the Deadline

An interruptible wait will wake on deadline cancellation, but you can make the decision clearer before allocating its timer:

~~~go
var ErrInsufficientDeadline = errors.New("insufficient time remaining before deadline")

func waitWithinDeadline(
	ctx context.Context,
	delay time.Duration,
	minAttempt time.Duration,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if delay < 0 {
		delay = 0
	}
	if minAttempt < 0 {
		minAttempt = 0
	}

	deadline, hasDeadline := ctx.Deadline()
	if hasDeadline {
		remaining := time.Until(deadline)
		if remaining <= 0 {
			if err := ctx.Err(); err != nil {
				return err
			}
			return context.DeadlineExceeded
		}
		if delay > remaining ||
			minAttempt > remaining-delay {
			if err := ctx.Err(); err != nil {
				return err
			}
			return ErrInsufficientDeadline
		}
	}

	if err := waitBackoff(ctx, delay); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if hasDeadline {
		remaining := time.Until(deadline)
		if remaining <= 0 {
			if err := ctx.Err(); err != nil {
				return err
			}
			return context.DeadlineExceeded
		}
		if minAttempt > remaining {
			if err := ctx.Err(); err != nil {
				return err
			}
			return ErrInsufficientDeadline
		}
	}
	return nil
}
~~~

The helper treats negative durations as zero, and the split comparisons avoid <code>time.Duration</code> addition overflow. It checks the <code>minAttempt</code> reserve before and after waiting, which helps avoid starting an attempt that cannot plausibly finish. <code>ErrInsufficientDeadline</code> distinguishes that policy refusal from a context deadline that has actually expired. A server-directed delay is subject to the same check.

Use duration and deadline operations that preserve the runtime's monotonic component. Wall-clock timestamps can jump because of synchronization or manual changes and are not appropriate for measuring elapsed backoff.

## Connect Graceful Shutdown to the Root

For a server or worker, derive operation contexts from a root context canceled by shutdown:

~~~go
root, stop := signal.NotifyContext(
	context.Background(),
	os.Interrupt,
	syscall.SIGTERM,
)
defer stop()

if err := runWorker(root); err != nil && !errors.Is(err, context.Canceled) {
	log.Printf("worker stopped: %v", err)
}
~~~

When shutdown starts:

1. stop accepting new work;
2. cancel work that is allowed to abort, including backoff waits;
3. allow a bounded drain period for work that must finish;
4. persist or return retryable work according to the queue contract;
5. close shared clients after active operations exit.

Not every operation should be canceled immediately. A transaction at its commit point or a message acknowledgement may need a short protected drain window. Define that boundary explicitly rather than detaching the entire retry loop from shutdown.

## Release Resources Before Sleeping

Cancellation-aware sleep does not help if the loop retains scarce resources throughout the wait. Before backoff:

- close or release the failed response body;
- return database connections to the pool;
- release a concurrency permit unless the policy intentionally reserves it;
- stop child goroutines and timers from the failed attempt;
- handle the queue message lease according to broker semantics;
- preserve only the minimum immutable data needed to rebuild the next attempt.

Holding a semaphore permit during a five-second backoff can starve new requests even though no retry is in flight. Acquire attempt-scoped capacity immediately before sending, not around the complete retry loop, unless fairness requirements dictate otherwise.

## Return the Cancellation Cause

Do not wrap cancellation into a generic retry-exhausted error. Callers need to distinguish:

- explicit caller cancellation;
- overall deadline expiry;
- insufficient remaining deadline budget;
- process shutdown;
- maximum attempts;
- non-retryable failure;
- retry-budget rejection.

In Go, retain <code>context.Canceled</code> and <code>context.DeadlineExceeded</code> in the error chain so <code>errors.Is</code> works. Newer context APIs can also carry a cancellation cause when the application needs to distinguish shutdown from another parent cancellation.

Cancellation should not be logged as an application error at every layer. Record it once at the boundary that owns the operation outcome, while per-attempt telemetry can mark the interrupted wait.

## Test Without Waiting in Real Time

At minimum, test:

- context canceled before the wait begins;
- cancellation while a long timer is pending;
- deadline shorter than delay plus minimum attempt time;
- zero and negative delays;
- timer completion followed immediately by cancellation;
- shutdown canceling many simultaneous sleepers;
- no new send after cancellation;
- response bodies and permits released before waiting.

Use an injected sleeper or fake clock for retry-policy tests. Keep one small integration test with a real timer to verify context wiring, but do not make the suite wait through production backoff values.

A leak test can start many long waits, cancel their common parent, and assert that all return promptly. Also monitor production gauges for sleeping retries and shutdown drain duration.

## Official Documentation

- [Go context package documentation](https://pkg.go.dev/context)
- [Go time package documentation](https://pkg.go.dev/time)
- [Go Concurrency Patterns: Context](https://go.dev/blog/context)
- [Go os/signal package documentation](https://pkg.go.dev/os/signal)

## Conclusion

Backoff is part of an operation, so it must obey the operation's cancellation and deadline. Wait on a timer and cancellation together, reject delays that leave no time for useful work, release attempt resources before sleeping, and connect worker shutdown to the same context tree.
