# Validation Summary: How to Implement Retry Logic with Exponential Backoff in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- tenacity (retry library)
- requests / urllib3 (`Retry`, `HTTPAdapter`)
- httpx (async HTTP client)
- psycopg2 (PostgreSQL driver)
- prometheus_client (metrics)
- asyncio
- Circuit breaker pattern (custom implementation)

## Sources Consulted
- Tenacity official API reference — https://tenacity.readthedocs.io/en/latest/api.html
- Tenacity documentation (wait/stop/retry strategies, callbacks) — https://tenacity.readthedocs.io/en/latest/
- requests / urllib3 `Retry` and `HTTPAdapter` documentation (standard usage)
- psycopg2 exception hierarchy (`OperationalError`, `InterfaceError`)

## Issues Found
No technical issues found.

All tenacity API usages were verified against the official API reference and are correct:
- `wait_exponential(multiplier=1, min=1, max=10)` — correct parameter names; backoff sequence (1s, 2s, 4s…) is accurate.
- `wait_exponential_jitter(initial=1, max=...)` — correct (uses `initial`, not `multiplier`).
- `wait_random_exponential(multiplier=1, max=...)` — correct.
- `wait_fixed`, `wait_random`, `wait_chain(*strategies)` — correct.
- `stop_after_attempt`, `stop_after_delay`, `stop_never`, `stop_any(*stops)`, `stop_all(*stops)` — correct. `stop_after_attempt(3)` counting the initial attempt is accurate.
- `retry_if_exception_type`, `retry_if_not_exception_type`, `retry_if_exception`, `retry_if_result`, `retry_any` — correct.
- `before_log(logger, level)`, `after_log(logger, level)`, `before_sleep_log(logger, level)` — correct signatures.
- `RetryCallState` attributes `attempt_number`, `fn`, and `outcome` are valid; `outcome.failed` and `outcome.exception()` are valid (tenacity's `Future` subclass exposes the `failed` property).
- Tenacity's automatic async detection for `async def` functions is accurate.

Supporting library usage is also correct: urllib3 `Retry(total=, backoff_factor=, status_forcelist=)`, `HTTPAdapter(max_retries=...)`, psycopg2 `OperationalError`/`InterfaceError` as retryable, and the custom circuit breaker state machine logic.

## Review Notes
- The basic example uses `stop_after_attempt(3)`, so only two waits actually occur (1s, 2s); the inline comment `# Wait 1s, 2s, 4s... up to 10s` describes the wait strategy in general rather than this specific call. This is accurate as an illustration, not an error.
- `fetch_until_data` (retry on empty result) and the `stop_never` example intentionally have no stop bound and could retry indefinitely; the post calls this out and pairs `stop_never` with a circuit-breaker caveat, so this is by design.
- urllib3's `Retry` by default only retries idempotent methods (POST is excluded unless `allowed_methods` is set). The post's `RetryableHTTPClient` relies on tenacity for application-level POST retries, so this default does not cause incorrect behavior, but readers extending the urllib3 layer to POST should be aware of it.
- The custom circuit breaker is illustrative; in production a maintained library (e.g., `pybreaker`) may be preferable. Not an error.
