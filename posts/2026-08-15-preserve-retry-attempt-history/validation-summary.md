# Validation Summary: Preserve Retry Attempt History Without Duplicate Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Python 3.7 through 3.11+
- Python exceptions, tracebacks, notes, and explicit exception chaining
- Python `asyncio`, dataclasses, type annotations, monotonic timing, and logging
- Retry policies, jittered backoff, and cancellation
- OpenTelemetry metrics, structured events, traces, and log correlation

## Sources Consulted

- [Python `BaseException.add_note`](https://docs.python.org/3/library/exceptions.html#BaseException.add_note)
- [Python exception context and chaining](https://docs.python.org/3/library/exceptions.html#exception-context)
- [Python `raise` statement](https://docs.python.org/3/reference/simple_stmts.html#the-raise-statement)
- [Python `except` clause and exception-reference cleanup](https://docs.python.org/3/reference/compound_stmts.html#except-clause)
- [Python traceback and frame object data model](https://docs.python.org/3/reference/datamodel.html#traceback-objects)
- [Python `time.monotonic`](https://docs.python.org/3/library/time.html#time.monotonic)
- [Python `asyncio.sleep`](https://docs.python.org/3/library/asyncio-task.html#asyncio.sleep)
- [Python `asyncio.CancelledError`](https://docs.python.org/3/library/asyncio-exceptions.html#asyncio.CancelledError)
- [Python `Logger.exception`](https://docs.python.org/3/library/logging.html#logging.Logger.exception)
- [Python `dataclasses`](https://docs.python.org/3/library/dataclasses.html)
- [PEP 604: `X | Y` union type syntax](https://peps.python.org/pep-0604/)
- [PEP 585: built-in collection generics](https://peps.python.org/pep-0585/)
- [OpenTelemetry Python metrics API](https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html#opentelemetry.metrics.Counter.add)
- [OpenTelemetry semantic conventions for events](https://opentelemetry.io/docs/specs/semconv/general/events/)
- [OpenTelemetry semantic conventions for recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry semantic conventions for exceptions in logs](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/)
- [OpenTelemetry logs data model: trace context fields](https://opentelemetry.io/docs/specs/otel/logs/data-model/#trace-context-fields)

## Issues Found

- The retry delay was awaited inside the `except` suite. That kept the caught exception and its traceback alive throughout the backoff and would make a cancellation raised by `asyncio.sleep` implicitly chain the failed attempt as its context. The sleep was dedented so the exception handler finishes before the backoff begins.
- `retry_attempts_total` was incremented for every caught retryable failure, including the terminal failure for which no retry occurs. It was renamed to `retryable_failures_total`, and the metrics guidance now distinguishes retryable failures from actual retry count.
- The terminal logging example caught only `RETRYABLE_EXCEPTIONS`, which would miss the `RetryExhausted` wrapper recommended for pre-3.11 Python. The example now catches a contract-specific `TERMINAL_RETRY_EXCEPTIONS`, with the correct choice documented for both the original-exception and wrapper contracts.
- The fallback was described broadly for all Python versions before 3.11 even though `dataclasses` entered the standard library in Python 3.7, the shown `list[T]` annotation requires 3.9, and `X | None` requires 3.10. The supported range and annotation adaptations are now explicit.
- The OpenTelemetry exceptions-on-spans documentation linked by the post is deprecated, and current OpenTelemetry guidance is moving new event emission to log-based events correlated with span context. The prose, documentation link, and conclusion were updated to describe the current transition accurately.
- The post recommended tracking cancellation during a selected delay, but `next_delay_ms` records only the selected duration. The wording now makes that distinction explicit and directs readers to add cancellation instrumentation around `asyncio.sleep` when needed.

## Review Notes

- The Python snippets intentionally depend on application-specific placeholders such as `RETRYABLE_EXCEPTIONS`, `TERMINAL_RETRY_EXCEPTIONS`, `full_jitter_ms`, `safe_error_code`, `format_attempt_history`, and telemetry instruments. Their shown call shapes are valid, but a complete application must define them.
- OpenTelemetry's general event semantic conventions are currently marked Development, and existing instrumentation may continue to emit span events during the migration to log-based events. The post now reflects that transitional state.
