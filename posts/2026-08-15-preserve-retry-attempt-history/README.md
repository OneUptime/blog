# Preserve Retry Attempt History Without Duplicate Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retry, Python, Exceptions, Observability, Logging, Backoff

Description: Attach bounded, sanitized attempt history to the final exception while emitting one owner-level terminal error log.

---

Logging a full exception on every attempt and again when retries exhaust creates several apparent incidents for one logical failure. Suppressing all intermediate detail has the opposite problem: the final error no longer shows how the retry policy behaved.

Keep structured attempt history in memory, attach it to the final exception, and choose one layer to own the terminal log.

## Store Summaries, Not Exception Objects

Earlier exception objects retain tracebacks and can keep large object graphs alive. Capture a small sanitized record instead:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class AttemptSummary:
    number: int
    elapsed_ms: int
    error_type: str
    error_code: str | None
    next_delay_ms: int | None
```

Avoid storing complete messages when they can contain URLs, tokens, SQL values, or customer data. Keep a bounded list or ring buffer if policies permit many attempts.

## Add History to the Final Original Error

Python 3.11 added `BaseException.add_note`. Notes appear in the standard traceback without changing the exception's type:

```python
import asyncio
import time

MAX_ATTEMPTS = 5

async def call_with_retry(operation):
    started = time.monotonic()
    history: list[AttemptSummary] = []

    for index in range(MAX_ATTEMPTS):
        try:
            return await operation()
        except RETRYABLE_EXCEPTIONS as error:
            final = index == MAX_ATTEMPTS - 1
            delay_ms = None if final else full_jitter_ms(index)

            history.append(AttemptSummary(
                number=index + 1,
                elapsed_ms=int((time.monotonic() - started) * 1000),
                error_type=type(error).__name__,
                error_code=safe_error_code(error),
                next_delay_ms=delay_ms,
            ))
            history[:] = history[-10:]

            retry_attempts_total.add(1, {"error_type": type(error).__name__})

            if final:
                error.add_note(format_attempt_history(history))
                raise  # Preserves the final attempt's traceback.

            await asyncio.sleep(delay_ms / 1000)
```

The caller still receives the final underlying exception. Its note gives the attempt count, elapsed times, safe classifications, and chosen delays. Earlier stack traces are intentionally not chained because they rarely add value and can consume substantial memory.

On Python versions before 3.11, wrap once at exhaustion and chain the final cause:

```python
raise RetryExhausted(history) from error
```

That changes the public exception type, so document it and keep `error` as the explicit cause.

## Give One Boundary Ownership of the Error Log

The retry helper should emit metrics and traces for attempts, not terminal stack traces. The boundary that can identify the logical operation logs once:

```python
try:
    await call_with_retry(send_invoice)
except RETRYABLE_EXCEPTIONS:
    logger.exception(
        "invoice delivery exhausted its retry budget",
        extra={"invoice_id": invoice_id, "operation_id": operation_id},
    )
    raise
```

If an attempt-level log is operationally necessary, emit a compact warning with a shared operation ID, attempt number, and delay. Configure the terminal owner not to repeat that same event through another middleware layer.

## Keep Metrics and Traces Per Attempt

Avoiding duplicate logs does not mean hiding retries. Record low-cardinality metrics such as retries by operation and error class, final exhaustion count, recovery-after-retry count, and backoff duration.

In distributed traces, one span for the logical operation can contain one event per attempt. Do not put raw exception messages or unique IDs into metric labels. Use trace and operation IDs to connect the final log to detailed attempt events.

Define whether the initial call counts as attempt one and keep that convention consistent across history, metrics, and user-facing errors. Also record whether a delay was selected but cancelled before it elapsed.

## Preserve the Final Failure Contract

Adding a note leaves exception matching unchanged. This is valuable when callers handle a typed HTTP, database, or domain error. A wrapper can better express retry exhaustion as a domain fact, but then callers must inspect `__cause__` for the last underlying error.

Choose deliberately rather than accidentally exposing whatever wrapper a retry library happens to create.

## Official Documentation

- [Python `BaseException.add_note`](https://docs.python.org/3/library/exceptions.html#BaseException.add_note)
- [Python exception context and chaining](https://docs.python.org/3/library/exceptions.html#exception-context)
- [Python `raise` statement](https://docs.python.org/3/reference/simple_stmts.html#the-raise-statement)
- [Python `time.monotonic`](https://docs.python.org/3/library/time.html#time.monotonic)
- [OpenTelemetry exception semantic conventions](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/)

## Conclusion

Capture bounded and sanitized summaries for each attempt, attach them once to the final error, and let one outer boundary own the terminal log. Metrics and trace events retain retry visibility without multiplying stack traces.
