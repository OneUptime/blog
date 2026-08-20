# Validation Summary: Combine Backoff and Concurrency Limits Without Starving New Work

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Python
- `asyncio`
- Concurrency limiting with semaphores
- Bounded and delayed queues
- Retry backoff and jitter
- Weighted fair scheduling
- Rate limiting and retry budgets
- AWS SDK retry modes and token buckets

## Sources Consulted

- [Python `asyncio.Semaphore` documentation](https://docs.python.org/3/library/asyncio-sync.html#asyncio.Semaphore)
- [Python asyncio queue documentation](https://docs.python.org/3/library/asyncio-queue.html)
- [Python asyncio timeout and cancellation documentation](https://docs.python.org/3/library/asyncio-task.html#timeouts)
- [Python `async with` language reference](https://docs.python.org/3/reference/compound_stmts.html#the-async-with-statement)
- [Python `asyncio.CancelledError` documentation](https://docs.python.org/3/library/asyncio-exceptions.html#asyncio.CancelledError)
- [AWS SDK retry behavior reference](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [AWS announcement of the 2026 retry behavior](https://aws.amazon.com/blogs/developer/announcing-updated-retry-behavior-for-aws-sdks-and-tools/)
- [Boto3 retry guide](https://docs.aws.amazon.com/boto3/latest/guide/retries.html)
- [AWS CLI retry guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-retries.html)
- [AWS Well-Architected guidance to fail fast and limit queues](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_fail_fast.html)
- [GitHub author profile](https://github.com/nawazdhandala) for link-target verification

## Issues Found

- The opening incorrectly implied that holding permits during backoff stops a concurrency limit from protecting the dependency. Such a limit still caps simultaneous calls, but it wastes capacity and blocks admission. The wording now makes that distinction and states that enough sleeping failures can occupy every permit.
- The first retry loop was shown outside an async-function context and slept after its fifth and final failure before implicitly returning `None`. It is now wrapped in a coroutine, defines `max_attempts`, re-raises the final `TransientError`, and sleeps only when another attempt remains.
- The second example did not define whether `work.attempt` was zero-based, making its exhaustion check susceptible to an extra attempt. The convention is now explicit, and the comparison counts the just-completed attempt correctly.
- The post described finite retry waves as necessarily starving fresh work. The wording now accurately describes the excessive delay they can cause.
- The queue description referred to `put` as waiting without showing that the coroutine must be awaited. It now uses the complete form `await queue.put(item)`.
- Selecting many items before semaphore acquisition could reintroduce dependence on the semaphore's undocumented wake-up order. The scheduler guidance now selects only when attempt capacity is available and prevents preselected items from accumulating at the semaphore.
- Weighted dequeueing controls the ratio of attempt starts, not how long attempts occupy permits. The post now requires an attempt deadline so slow or hung retries cannot monopolize concurrency indefinitely.
- The concurrency/rate-gate sentence did not exclude waiting for rate eligibility while holding a concurrency permit. It now makes that ordering constraint explicit.
- A delayed retry is not necessarily stored in queue memory because the scheduler may use durable storage. The description now uses the implementation-neutral term "scheduler storage."

## Review Notes

- `asyncio.timeout()` is current and non-deprecated, but it requires Python 3.11 or later. `asyncio.wait_for()` remains available for earlier supported Python versions.
- The Python snippets use valid syntax in their shown async context but remain illustrative; application-specific names such as `TransientError`, `Success`, `RetryableFailure`, `full_jitter`, and the `work`/scheduler interfaces must be supplied by the application.
- An in-memory heap scheduler should use a monotonic clock and wake its timer when a newly inserted item has an earlier deadline. Cancellation or caller-deadline state should be checked again immediately before an attempt starts to close promotion races.
- The AWS `AWS_NEW_RETRIES_2026=true` opt-in statement is accurate as of 2026-08-20. AWS announced that the updated behavior is scheduled to become the default in November 2026, so this time-sensitive paragraph should be revalidated after that rollout.
