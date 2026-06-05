# Validation Summary: How to Monitor Celery Task Retries and Failures with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- Celery task retries and task lifecycle hooks
- OpenTelemetry traces, spans, events, and metrics
- OpenTelemetry Python Celery instrumentation
- OTLP trace and metric exporters
- HTTP span semantic conventions
- Circuit breaker pattern

## Sources Consulted
- Celery task retry, autoretry, retry backoff, jitter, and task hook documentation: https://docs.celeryq.dev/en/stable/userguide/tasks.html
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry trace API specification for span status and exception recording: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Python Celery instrumentation documentation: https://opentelemetry-python-kinvolk.readthedocs.io/en/latest/instrumentation/celery/celery.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Requests quickstart and exception documentation: https://requests.readthedocs.io/en/master/user/quickstart/ and https://requests.readthedocs.io/en/stable/api/

## Issues Found
- The HTTP task claimed 4xx responses would fail immediately, but `requests.HTTPError` subclasses `RequestException`, so the original code would still trigger `autoretry_for=(RequestException,)`. Added a `NonRetryableHTTPError` wrapper for 4xx responses so only 5xx HTTP errors and other `RequestException` failures autoretry.
- The HTTP span attributes used older semantic-convention constants for URL, method, status code, and response size. Replaced them with current stable attribute names: `url.full`, `http.request.method`, `http.response.status_code`, and `http.response.body.size`.
- The Celery instrumentation package was installed but not initialized in the setup example. Added `CeleryInstrumentor().instrument()` under Celery's `worker_process_init` signal, matching the official OpenTelemetry Celery instrumentation guidance for worker processes.
- The retry hook text said it created a "link event." OpenTelemetry span links are distinct from events, and the code only adds events and attributes. Updated the wording to say retry attempts can be correlated by task id.
- The metrics task counted Celery's `Retry` semi-predicate as a permanent failure because `Retry` is an exception used for Celery control flow. Added an explicit `except Retry: raise` before permanent-failure metric handling.
- The circuit breaker raised a generic `Exception` while the task used `autoretry_for=(Exception,)`, so a fail-fast circuit-breaker open state would be retried. Added a `CircuitBreakerOpen` exception and `dont_autoretry_for=(CircuitBreakerOpen,)`.
- The base-class docstring said it automatically recorded time between retries, but the example records retry scheduling metadata rather than measuring elapsed wall-clock time between executions. Updated the wording to match the code.

## Review Notes
The circuit breaker example is process-local and in-memory, so production deployments with multiple Celery worker processes would need a shared store if the circuit state must be global. The `retry_delay_histogram` is defined as a useful metric instrument but the post does not include a full recording path for every retry mode; that is acceptable for a focused tutorial but could be expanded in a future revision.
