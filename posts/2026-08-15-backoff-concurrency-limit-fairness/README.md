# Combine Backoff and Concurrency Limits Without Starving New Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Concurrency, AsyncIO, Scheduling, Fairness, Retry

Description: Release permits during backoff and admit due retries through a fair scheduler so failed work cannot monopolize capacity.

---

A concurrency limit still caps simultaneous calls when permits are held during backoff, but holding them wastes capacity. If enough failed tasks keep their permits while sleeping, waiting retries can consume all permits without sending requests. New work cannot start even though the dependency is idle.

Release the permit after each attempt, schedule the retry for later, and make due retries compete fairly with fresh work.

## Never Sleep Inside the Permit

This structure can block new work throughout each backoff:

```python
async def call_with_retries(attempt_limit):
    max_attempts = 5

    async with attempt_limit:
        for attempt in range(max_attempts):
            try:
                return await call_dependency()
            except TransientError:
                if attempt + 1 >= max_attempts:
                    raise
                await asyncio.sleep(backoff(attempt))  # Permit remains occupied.
```

Limit one attempt at a time instead. In this example, `work.attempt` is a zero-based attempt index, and `work.max_attempts` includes the initial call.

```python
async def run_attempt(work, attempt_limit):
    try:
        async with attempt_limit:
            value = await work.call_once()
        return Success(value)
    except TransientError as error:
        return RetryableFailure(error)

async def handle(work, attempt_limit, retry_scheduler):
    result = await run_attempt(work, attempt_limit)

    if isinstance(result, RetryableFailure):
        if work.attempt + 1 >= work.max_attempts:
            await work.fail(result.error)
            return

        delay = full_jitter(work.attempt)
        await retry_scheduler.schedule(work.next_attempt(), delay)
        return

    await work.succeed(result.value)
```

By the time `schedule` records the future retry, the `async with` block has exited. The delayed item uses scheduler storage, not an active-attempt permit.

## Use a Delayed Queue, Not One Task per Long Sleep

A few sleeping tasks are fine. A worker handling millions of failures should persist `next_attempt_at` or keep delayed items in a time-ordered heap serviced by one timer. Promote only due items into a ready queue.

Bound both delayed and ready queues. When capacity is full, apply backpressure, reject optional work, or durably spill according to business policy. An unbounded retry queue merely moves the outage into memory.

Python's `asyncio.Queue` supports bounded capacity through `maxsize`; `await queue.put(item)` waits when a bounded queue is full. Queue operations do not provide built-in timeouts, so wrap them with `asyncio.wait_for` or `asyncio.timeout` when admission itself has a deadline.

## Give Fresh Work and Retries Separate Lanes

One FIFO queue can still delay fresh work excessively if a large retry wave becomes ready first. Maintain at least two ready lanes:

```text
fresh_ready
retry_ready
```

Use a weighted policy, for example up to three fresh attempts followed by one due retry while both lanes are nonempty. Borrow unused capacity when either lane is empty. The exact ratio is a product decision: interactive traffic may favor fresh work, while durable background jobs may need a minimum retry share to avoid infinite delay.

Weighted admission controls attempt starts, not execution time. Give every attempt a deadline so slow or hung retries cannot occupy all permits indefinitely.

Add per-tenant or per-key round-robin selection inside each lane. Global fairness alone does not prevent one tenant's retry backlog from consuming the retry share.

Do not rely on semaphore wake-up order as the scheduling policy. Select through the fair scheduler only when attempt capacity is available, then start the selected item immediately; do not let preselected items accumulate at the semaphore.

## Combine Concurrency, Rate, and Retry Budgets

These controls solve different problems:

- Concurrency limits simultaneous resource use.
- Rate limits attempt starts per unit time.
- Backoff chooses when one failed item becomes eligible again.
- A retry budget limits how much capacity retries can consume.
- Fair scheduling decides which eligible class goes next.

Every attempt should pass through both gates immediately before it starts, without holding a concurrency permit while waiting for rate eligibility. A due retry is eligible, not entitled to immediate execution.

AWS SDK retry behavior illustrates the separation: standard mode uses a retry token bucket in addition to exponential backoff and jitter, while adaptive mode adds a request-rate token bucket. As of August 2026, AWS says the behavior in its current cross-SDK guide requires `AWS_NEW_RETRIES_2026=true`; without that opt-in, SDKs use pre-2026 behavior with different timing, quota costs, and defaults. A custom scheduler can use the same principle without copying service-specific constants.

## Handle Cancellation and Completion

Remove cancelled work from delayed storage, or mark it so promotion skips it. If a caller deadline expires during backoff, do not enqueue the attempt merely because its timer fired.

Keep stable operation IDs and make attempts idempotent. A concurrency scheduler cannot determine whether a timed-out remote operation committed. Track metrics for active attempts, fresh and retry queue ages, admission wait, permit utilization, retry share, drops, and per-tenant fairness.

Test with a sustained stream of new work plus a synchronized retry wave. Verify both that new-work latency remains bounded and that retries continue to make measurable progress.

## Official Documentation

- [Python `asyncio.Semaphore`](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore)
- [Python asyncio queues](https://docs.python.org/3/library/asyncio-queue.html)
- [Python `asyncio.timeout`](https://docs.python.org/3/library/asyncio-task.html#asyncio.timeout)
- [AWS SDK retry behavior and token buckets](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS Well-Architected guidance to fail fast and limit queues](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html)

## Conclusion

Make permits represent active attempts only. Put delayed retries outside the semaphore, promote them when due, and use bounded weighted lanes so fresh work stays responsive while retryable work still progresses.
