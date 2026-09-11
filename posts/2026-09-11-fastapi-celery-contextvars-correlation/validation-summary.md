# Validation Summary: Preserve Correlation IDs Across FastAPI and Celery Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python contextvars, asyncio, regular expressions, UUIDs, and JSON logging
- FastAPI and Starlette HTTP middleware
- Uvicorn ASGI server
- Celery task publication, request headers, worker execution, and task identity
- OpenTelemetry and W3C trace-context propagation

## Sources Consulted
- Python contextvars: https://docs.python.org/3/library/contextvars.html
- Python asyncio.to_thread: https://docs.python.org/3/library/asyncio-task.html#asyncio.to_thread
- Python regular expressions: https://docs.python.org/3/library/re.html#re.Pattern.fullmatch
- Python UUID generation: https://docs.python.org/3/library/uuid.html#uuid.uuid4
- FastAPI middleware: https://fastapi.tiangolo.com/tutorial/middleware/
- Starlette middleware and BaseHTTPMiddleware limitations: https://starlette.dev/middleware/
- Celery task request attributes, bound tasks, retries, and results: https://docs.celeryq.dev/en/stable/userguide/tasks.html
- Celery publication API: https://docs.celeryq.dev/en/stable/userguide/calling.html
- Celery Context header filtering and Task.apply_async implementation: https://docs.celeryq.dev/en/stable/_modules/celery/app/task.html
- Celery CLI reference: https://docs.celeryq.dev/en/stable/reference/cli.html
- Uvicorn settings: https://uvicorn.dev/settings/
- OpenTelemetry Python propagation: https://opentelemetry.io/docs/languages/python/propagation/

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The post is technically relevant and uses supported APIs. Celery's stable documentation consulted identifies itself as version 5.6.3.
- Parsed all three Python examples successfully. Executed the shared context module and checked valid values, missing and malformed values, length bounds, whitespace/control-character rejection, generated UUID format, and nested token restoration.
- Executed 50 concurrent asyncio scopes and verified independent values, propagation through asyncio.to_thread, and restoration of the default context afterward. asyncio.to_thread requires Python 3.9 or later and also copies the current context into its thread; explicitly capturing the header remains correct.
- Confirmed the bound-task request API and the custom headers publication option. Celery reserves correlation_id on its request context and removes reserved keys when deriving custom request headers, supporting the example's x-correlation-id transport key.
- The task's try/finally correctly restores its preceding context on normal return or a Python exception. Missing or invalid correlation header values receive a generated ID. Task IDs, application correlation IDs, retry attempts, and trace context are appropriately distinguished.
- The HTTP middleware's downstream context propagation is appropriate for this example. Starlette documents limitations on propagating endpoint context changes upward through BaseHTTPMiddleware. The post already qualifies response-header coverage for outer errors and streaming behavior.
- Reviewed both launch commands against official CLI documentation. They assume the modules are importable from the working directory, dependencies are installed, CELERY_BROKER_URL is set, and each long-running process is started separately.
- The absence of a result backend is accurately explained. Framework logging is not automatically enriched by this example; the explicit task log helper supplies the correlation field.
- No live broker, FastAPI server, or Celery worker was started. Cross-process delivery, forced task failures, worker reuse, retry/canvas propagation, and alternate pools were reviewed from code and documentation rather than exercised end to end. The post explicitly recommends deployment-specific testing for those paths.
- The technical documentation links in the post resolve to the intended resources. The author profile is attribution rather than a technical source.
