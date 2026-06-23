# Validation Summary: How to Mock External APIs in Python Tests with responses and pytest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- requests (HTTP client)
- httpx (async HTTP client)
- responses (HTTP mocking for requests)
- respx (HTTP mocking for httpx)
- pytest
- pytest-asyncio
- pytest-mock
- tenacity (retry library)

## Sources Consulted
- responses documentation / GitHub README — https://github.com/getsentry/responses (API: `responses.add`, `responses.activate`, `responses.calls`, `add_callback`, `RequestsMock`, `.replace()`, `add_passthru`, regex URL matching, passing an `Exception` as `body`)
- respx documentation — https://lundberg.github.io/respx/ (`respx.mock`, `respx.get(...).mock(return_value=Response(...))`)
- httpx documentation — https://www.python-httpx.org/ (`AsyncClient`, `raise_for_status`, `HTTPStatusError`)
- requests documentation — https://requests.readthedocs.io/ (`raise_for_status`, `HTTPError`, `Timeout`, `ConnectionError`)
- tenacity documentation — https://tenacity.readthedocs.io/ (`@retry`, `stop_after_attempt`, `wait_exponential`, `reraise`, default `RetryError` behavior)
- pytest-asyncio docs — https://pytest-asyncio.readthedocs.io/ (`@pytest.mark.asyncio`)
- pytest-mock docs — https://pytest-mock.readthedocs.io/ (`mocker` fixture)

## Issues Found
1. **Retry test would fail due to tenacity's default exhaustion behavior.** The `ResilientClient.fetch_data` method used `@retry(stop=stop_after_attempt(3), wait=...)` without `reraise=True`. By default, tenacity wraps the final exception in `tenacity.RetryError` once retries are exhausted, so the `test_retry_exhausted` test asserting `pytest.raises(requests.HTTPError)` would not pass — it would receive a `tenacity.RetryError` instead. Fixed by adding `reraise=True` to the `@retry` decorator (which makes the original `requests.HTTPError` propagate) and added a clarifying comment. This makes the production code consistent with the test that follows it.

2. **Installation command was missing several required dependencies.** The post's code uses `@pytest.mark.asyncio` (requires `pytest-asyncio`), the `mocker` fixture (requires `pytest-mock`), and `tenacity` (for the retry section), but the `pip install` line only listed `responses pytest requests httpx respx`. Added `pytest-asyncio pytest-mock tenacity` so the examples are actually runnable.

## Review Notes
- The `responses` usage is accurate: passing an `Exception` instance as `body` to simulate timeouts/connection errors, `responses.calls` inspection, `add_callback` with a `(status, headers, body)` tuple return, `RequestsMock` context-manager fixtures, `.replace()`, regex URL matching via `re.compile`, and `add_passthru` are all current API.
- The respx examples (`respx.get(...).mock(return_value=Response(...))` and the `@respx.mock` decorator) match current respx API.
- Minor (not corrected, illustrative): the "Recording Real API Responses" and combined-mocking snippets reference `pytest` and a `DataClient` that aren't imported/defined within the shown excerpt — acceptable for illustrative fragments.
- The retry tests use `wait_exponential(min=1, ...)`, which introduces real sleep delays (~1s+ between attempts), making those tests slower. Not incorrect, but in practice authors often patch/zero the wait in tests for speed.
- Decorator ordering for the async tests (`@pytest.mark.asyncio` outer, `@respx.mock` inner) is correct.
