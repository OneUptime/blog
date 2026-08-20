# Validation Summary: Log Retry Failures Without Disabling Backoff

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python exception handling and exception chaining
- Python logging
- Tenacity retry policies and lifecycle hooks
- Exponential backoff with jitter
- Exception-based and result-based retry predicates

## Sources Consulted
- Tenacity official documentation: retry behavior, stop and wait policies, result predicates, error handling, and logging callbacks (https://tenacity.readthedocs.io/en/latest/)
- Tenacity official API reference: `before_sleep_log`, `retry_if_exception_type`, `retry_if_result`, `stop_after_attempt`, and `wait_random_exponential` (https://tenacity.readthedocs.io/en/latest/api.html)
- Tenacity upstream 9.2.0 release (https://github.com/jd/tenacity/releases/tag/9.2.0)
- Tenacity upstream 9.2.0 retry controller and callback ordering (https://github.com/jd/tenacity/blob/9.2.0/tenacity/__init__.py)
- Tenacity upstream 9.2.0 retry predicate implementation and composition operators (https://github.com/jd/tenacity/blob/9.2.0/tenacity/retry.py)
- Tenacity upstream 9.2.0 `before_sleep_log` implementation (https://github.com/jd/tenacity/blob/9.2.0/tenacity/before_sleep.py)
- Tenacity package metadata and published release history (https://pypi.org/project/tenacity/)
- Python language reference: `raise` statement and explicit exception chaining (https://docs.python.org/3/reference/simple_stmts.html#the-raise-statement)
- Python standard library: exception context, hierarchy, `KeyboardInterrupt`, and `SystemExit` (https://docs.python.org/3/library/exceptions.html)
- Python standard library: `asyncio.CancelledError` (https://docs.python.org/3/library/asyncio-exceptions.html#asyncio.CancelledError)
- Python standard library: `Logger.exception()` and logging `extra` fields (https://docs.python.org/3/library/logging.html#logging.Logger.exception)

## Issues Found
- The opening said that the decorated function does not retry, but Tenacity can still retry any uncaught `Exception` under its default predicate. Changed the sentence to say specifically that caught timeouts are not retried.
- The `before_sleep` description and lifecycle sequence could imply that the hook runs after the final exhausted failure. Clarified that Tenacity invokes it only when the outcome has been selected for another retry and the stop policy permits another attempt.
- The advice about catching `BaseException` referred broadly to cancellation and "process-exit signals." Replaced those terms with the precise `asyncio.CancelledError`, `KeyboardInterrupt`, and `SystemExit` exception classes.
- The result-retry section said that the callback returns the real result. A `retry_if_result` predicate returns a Boolean; the decorated operation returns the business result. Replaced "callback" with "retried operation."

## Review Notes
- All five Python code blocks are syntactically valid. The application-specific names such as `api`, `repository`, and `TransientDatabaseError` are intentionally illustrative dependencies.
- The Tenacity imports and call signatures used by the post are current and non-deprecated. They were checked against the latest published PyPI distribution, 9.1.4, and the latest upstream release source, 9.2.0.
- Isolated behavior tests confirmed that a caught timeout returned as `None` performs one attempt and no sleep; propagated retryable exceptions honor the attempt limit; `before_sleep` runs only before actual retries; `reraise=True` exposes the final exception; cleanup plus bare `raise` preserves retry signaling; and combined exception/result predicates work as shown.
- `before_sleep_log` emits a formatted text message with the operation, selected delay, and exception information. Implementing the later recommendation for structured fields, an explicit attempt number, retry metrics, or recovery metrics requires a custom callback using `RetryCallState`.
- All links in the post resolve to the intended official documentation or author profile.
