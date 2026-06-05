# Validation Summary: How to Propagate OpenTelemetry Trace Context Through Celery Message Headers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry context propagation
- W3C Trace Context
- Celery tasks and message headers
- FastAPI instrumentation
- Redis broker usage
- Python

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Contrib Celery instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/celery.html
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- Celery 5.6 task reference: https://docs.celeryq.dev/en/stable/reference/celery.app.task.html
- Celery 5.6 calling tasks guide: https://docs.celeryq.dev/en/stable/userguide/calling.html
- Celery 5.6 task message protocol: https://docs.celeryq.dev/en/latest/internals/protocol.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The sequence diagram said the worker injects context from headers. Workers receive headers and extract context from them, so this was corrected to "Extract context from headers."
- The install command omitted `opentelemetry-instrumentation-fastapi` even though a later example imports `FastAPIInstrumentor`. The missing package was added.
- The install command also omitted `fastapi` even though later examples import `FastAPI`. The missing package was added.
- The setup snippet imported `CeleryInstrumentor` but the article implements manual propagation through a custom task base class and does not use that instrumentor. The unused import was removed.
- The `apply_async` example injected context before starting the producer span, while the later trace diagram shows task execution under the publish span. The injection was moved inside the producer span so the propagated context represents the publish span.
- The FastAPI example imported `BackgroundTasks` but did not use it. The unused import was removed.
- The setup section did not mention Celery's prefork worker initialization caveat for tracing components such as `BatchSpanProcessor`. A short note was added to initialize tracing in each worker child process, for example from `worker_process_init`.

## Review Notes
The examples use manual Celery tracing. OpenTelemetry's official Celery instrumentation can also propagate Celery context automatically, but mixing both approaches in the same app may produce duplicate spans. The snippets also demonstrate blocking on Celery results inside FastAPI routes only as examples and already warn that this should not be used as a production pattern.
