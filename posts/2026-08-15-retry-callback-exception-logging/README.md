# Log Retry Failures Without Disabling Backoff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retry, Backoff, Python, Tenacity, Exception, Logging

Description: Keep retry failures visible without swallowing the exception signal that a retry library needs to apply backoff.

---

Exception-based retry libraries usually decide to retry because the operation raised. If the operation catches that exception, logs it, and returns normally, the retry wrapper sees success. No retry occurs and no backoff delay is scheduled.

Log through retry lifecycle hooks, or re-raise after local cleanup.

## The Failure-Swallowing Pattern

This Tenacity-decorated function does not retry caught timeouts:

```python
import logging
from tenacity import retry, stop_after_attempt, wait_random_exponential

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(5),
    wait=wait_random_exponential(multiplier=0.5, max=30),
)
def fetch_order(order_id: str):
    try:
        return api.get_order(order_id)
    except TimeoutError:
        logger.exception("order request failed")
        return None  # A normal return tells Tenacity that the call succeeded.
```

Tenacity retries exceptions by default. It can also retry selected return values, but silently converting every exception into `None` mixes failure signaling with valid business results and is easy to misconfigure.

## Use a Before-Sleep Hook

Tenacity provides `before_sleep` specifically for work that should run after a failure has been selected for another retry and before its delay:

```python
import logging
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_random_exponential,
)

logger = logging.getLogger(__name__)

@retry(
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    stop=stop_after_attempt(5),
    wait=wait_random_exponential(multiplier=0.5, max=30),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def fetch_order(order_id: str):
    response = api.get_order(order_id)
    response.validate()
    return response
```

The operation now raises unchanged. Tenacity classifies the exception and records the attempt. If the stop policy permits another attempt, it invokes the logging hook, waits, and calls the function again. With `reraise=True`, exhaustion propagates the final underlying exception instead of a `RetryError` wrapper.

## Re-Raise When Cleanup Belongs Locally

Sometimes the operation must clean up resources or add context. Catch narrowly and use a bare `raise`:

```python
@retry(
    retry=retry_if_exception_type(TransientDatabaseError),
    stop=stop_after_attempt(4),
    wait=wait_random_exponential(multiplier=0.2, max=5),
    reraise=True,
)
def write_projection(event):
    try:
        return repository.write(event)
    except TransientDatabaseError:
        repository.discard_session()
        raise
```

A bare `raise` preserves the current exception and traceback. If you translate the exception, chain it explicitly with `raise NewError(...) from error` and ensure the retry predicate recognizes the new type.

Do not catch `BaseException`; `asyncio.CancelledError`, `KeyboardInterrupt`, and `SystemExit` generally should not become retries.

## Log Once at the Right Levels

Logging a full stack trace inside the operation and again after exhaustion creates noisy duplicate incidents. A useful policy is:

- Emit a structured warning before each sleep with operation, attempt, exception type, and selected delay.
- Increment retry metrics for every retryable failure.
- Emit one error with a stack trace at the outer boundary when all attempts fail.
- Emit a recovery metric if a later attempt succeeds.

```python
try:
    order = fetch_order(order_id)
except (TimeoutError, ConnectionError):
    logger.exception("order request exhausted its retry budget", extra={
        "order_id": order_id,
    })
    raise
```

Never log credentials, bearer tokens, or complete sensitive payloads in retry callbacks. Use stable request or trace identifiers to correlate attempts.

## Distinguish Exception and Result Retries

If an API returns a valid object that means "not ready," configure a result predicate explicitly. Keep that separate from exceptions:

```python
from tenacity import retry_if_exception_type, retry_if_result

retry_policy = (
    retry_if_exception_type(TimeoutError)
    | retry_if_result(lambda result: result.status == "pending")
)
```

The retried operation still needs to return the real result. Do not use an exception handler to manufacture a value that accidentally satisfies the success path.

## Official Documentation

- [Tenacity documentation](https://tenacity.readthedocs.io/en/latest/)
- [Tenacity before, after, and before-sleep logging](https://tenacity.readthedocs.io/en/latest/#before-and-after-retry-and-logging)
- [Python `raise` statement](https://docs.python.org/3/reference/simple_stmts.html#the-raise-statement)
- [Python exception context and chaining](https://docs.python.org/3/library/exceptions.html#exception-context)

## Conclusion

The raised exception is part of the retry library's control flow. Let it escape the operation, use a retry hook for attempt-level logging, and reserve one terminal error log for the boundary that owns the failed operation.
