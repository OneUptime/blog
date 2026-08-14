# Test Jittered Retry Logic Without Slow or Flaky Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retries, Jitter, Testing, Go, Fake Clock, Exponential Backoff

Description: Make retry tests deterministic by injecting random draws, waits, and time while asserting policy decisions instead of sleeping on the wall clock.

---

Retry code combines three sources of nondeterminism: random jitter, elapsed time, and asynchronous cancellation. Tests that use production randomness and real sleeps are slow, occasionally fail at timing boundaries, and still do not prove that the intended decisions occurred.

Separate retry policy from effects. A policy computes eligibility and candidate delay. Injected dependencies supply random values, monotonic time, and waiting. Unit tests can then execute a multi-minute logical schedule instantly and reproduce every decision.

## Split Calculation from Waiting

The pure part of a full-jitter policy can accept the random draw as input:

~~~go
type Policy struct {
	Base time.Duration
	Cap  time.Duration
}

func (p Policy) Delay(attempt int, unit float64) time.Duration {
	if attempt < 0 {
		attempt = 0
	}
	if unit < 0 {
		unit = 0
	}
	if unit >= 1 {
		unit = math.Nextafter(1, 0)
	}

	raw := p.Base
	for i := 0; i < attempt && raw < p.Cap; i++ {
		if raw > p.Cap/2 {
			raw = p.Cap
			break
		}
		raw *= 2
	}
	if raw > p.Cap {
		raw = p.Cap
	}
	return time.Duration(float64(raw) * unit)
}
~~~

The snippet assumes construction has already validated <code>Base &gt; 0</code> and <code>Cap &gt;= Base</code>. The explicit cap check then prevents duration overflow from repeated multiplication. Define attempt numbering in the API: in this example, attempt zero computes the delay before the first retry.

Production can pass a uniform draw in the half-open interval <code>[0, 1)</code>. Tests pass exact values such as <code>0</code>, <code>0.5</code>, and a value immediately below <code>1</code>. That proves the mapping without depending on a particular pseudo-random generator's sequence.

## Inject the Wait Operation

Make sleeping an interface:

~~~go
type Sleeper interface {
	Wait(context.Context, time.Duration) error
}

type RecordingSleeper struct {
	Delays []time.Duration
	Err    error
}

func (s *RecordingSleeper) Wait(
	_ context.Context,
	delay time.Duration,
) error {
	s.Delays = append(s.Delays, delay)
	return s.Err
}
~~~

The retry loop receives a <code>Sleeper</code> and a draw function. A test can assert the exact recorded delay sequence and return <code>context.Canceled</code> on a chosen wait. Production uses a timer that selects between timer completion and <code>ctx.Done()</code>.

Do not replace only <code>time.Sleep</code> while the policy still calls <code>time.Now</code> directly. Deadline tests also need an injected monotonic clock or a context/fake-time facility that both the loop and sleeper share.

## Test Invariants, Not One Lucky Sequence

For jitter, stable invariants matter more than the exact output of a library RNG:

- full-jitter delay is greater than or equal to zero and less than the capped raw delay;
- raw exponential delay never exceeds the cap;
- equal-jitter delay remains in its documented half-to-full interval;
- server-directed delay takes the documented precedence;
- a deadline can reject a delay even when it is in the jitter range;
- duration arithmetic does not overflow for a very large attempt number.

A fixed seed can make a pseudo-random sequence reproducible within the implementation you selected. Go's <code>math/rand/v2</code> supports explicit sources such as PCG, but tests should not assume that top-level random functions or future algorithm changes preserve a sequence unless that guarantee belongs to your own abstraction.

Use a sequence stub when exact draws are part of the scenario:

~~~go
type DrawSequence struct {
	Values []float64
	index  int
}

func (d *DrawSequence) Next() float64 {
	value := d.Values[d.index]
	d.index++
	return value
}
~~~

Fail the test clearly when the loop asks for more draws than supplied. An unexpected extra draw often reveals an unexpected extra retry.

## Drive a Fake Clock Explicitly

A fake clock should not advance merely because code reads it. Advance only when the test requests or when the fake sleeper models completion. This lets the test describe:

~~~text
t=0       first attempt fails
t=200ms   backoff completes
t=350ms   second attempt times out
t=750ms   second backoff completes
t=900ms   overall deadline leaves no useful attempt budget
~~~

If the retry loop waits in a goroutine, coordinate clock advancement with evidence that the timer has been registered. Advancing before registration creates test races that look like production bugs. Prefer a fake-clock library with documented waiter synchronization or expose a test hook that confirms the wait began.

Keep one or two real-timer integration tests to validate wiring to the runtime, using generous timing bounds. They should not encode the entire retry matrix.

## Cover the Complete Decision Table

A good suite includes:

### Retry classification

- transient response on a replay-safe operation;
- the same response on a non-replayable operation;
- permanent error and authentication failure;
- operation-specific transient error overriding a generic status.

### Scheduling

- initial delay, growth, and cap;
- zero, midpoint, and near-upper-bound jitter;
- valid, invalid, negative, and excessive server delay;
- retry-token approval and rejection.

### Stopping

- success on each possible attempt;
- total-attempt limit;
- total elapsed deadline;
- insufficient time for the next attempt;
- cancellation before send and during wait.

### Cleanup

- response body closed before wait;
- concurrency permit released between attempts;
- timer canceled when the context ends;
- final error retains the last cause and attempt history.

Table-driven tests make the distinction between total attempts and retries explicit. Name fields <code>maxAttempts</code> or <code>maxRetries</code> accurately and assert backend invocation count.

## Test Randomness Separately from Policy

Policy unit tests use controlled draws. A separate statistical smoke test can sample the production random source and check broad properties, such as values staying in range and occupying multiple buckets. Do not require an exact histogram in ordinary CI; probabilistic thresholds can still flake.

Random sources used concurrently need the synchronization documented by their implementation. The Go <code>math/rand/v2</code> package notes that a <code>Source</code> or <code>Rand</code> is normally for one goroutine at a time, while top-level functions are safe for concurrent use. Wrap or partition an injected source accordingly.

Never seed every production replica with the same constant. That creates repeatable, synchronized jitter after a fleet restart. Deterministic seeding belongs in tests, not in the deployed policy.

## Official Documentation

- [Go math/rand/v2 package documentation](https://pkg.go.dev/math/rand/v2)
- [Go testing package documentation](https://pkg.go.dev/testing)
- [Go time package documentation](https://pkg.go.dev/time)

## Conclusion

Deterministic retry tests control random draws, waiting, and elapsed time independently. Assert delay ranges, stop reasons, invocation counts, deadline behavior, and cleanup through injected effects. Reserve real time and real randomness for a small integration surface, not the core policy suite.
