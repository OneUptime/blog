# Validation Summary: How to Implement Circuit Breakers in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- pybreaker
- requests
- FastAPI
- Starlette thread pool utilities
- pytest
- Mermaid state diagrams

## Sources Consulted
- pybreaker README and API examples: https://github.com/danielfm/pybreaker
- pybreaker PyPI project page: https://pypi.org/project/pybreaker/
- FastAPI async documentation: https://fastapi.tiangolo.com/async/
- Starlette thread pool documentation: https://starlette.dev/threadpool/
- Requests quickstart documentation: https://requests.readthedocs.io/en/latest/user/quickstart/

## Issues Found
- The basic pybreaker example said the breaker opens after 5 failures "within 30 seconds", but pybreaker's `fail_max` counts consecutive failures and no 30-second window was configured. Changed the comment to "5 consecutive failures."
- The configured listener example used `requests.HTTPError` without importing `requests`. Added the missing import.
- The configured listener used `str(new_state)` and `str(old_state)`, which produces object representations in current pybreaker. Changed state logging and alert checks to use `.name` and `pybreaker.STATE_OPEN`.
- The configured breaker showed a callable `exclude` example as `exclude=lambda ...`, but pybreaker expects excluded exception types and callables inside the `exclude` iterable. Changed the example to `exclude=[ValueError, KeyError, is_client_error]`.
- The custom circuit breaker example used `requests.get()` without importing `requests`. Added the missing import.
- The custom circuit breaker claimed thread safety but incremented rejected-call stats outside the lock in some paths. Wrapped those increments with the existing lock.
- The fallback example used `requests.get()` without importing `requests`. Added the missing import.
- The FastAPI example defined `async` endpoints while calling blocking synchronous HTTP code directly. Changed the protected calls to run through Starlette's `run_in_threadpool`, consistent with FastAPI/Starlette guidance for blocking work.
- The FastAPI health endpoint used `str(breaker.state)`, which returns a pybreaker state object representation. Changed it to `breaker.current_state`.
- The pybreaker tests expected the original exception on the call that trips the breaker, but pybreaker raises `CircuitBreakerError` by default when `throw_new_error_on_trip=True`. Added `throw_new_error_on_trip=False` to tests that assert the original exception during trip calls.
- Replaced deprecated `datetime.utcnow()` with timezone-aware `datetime.now(timezone.utc)`.

## Review Notes
The code blocks were syntax-checked after edits, and pybreaker's trip behavior was verified against the installed current package in an isolated temporary target directory. The FastAPI example still uses synchronous `requests` calls for simplicity, but now runs them off the event loop.
