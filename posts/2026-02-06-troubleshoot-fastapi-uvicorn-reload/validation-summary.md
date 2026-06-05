# Validation Summary: How to Troubleshoot FastAPI Instrumentation Failing with uvicorn --reload

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry FastAPI instrumentation
- FastAPI lifespan events
- Uvicorn
- Gunicorn
- watchfiles
- Docker

## Sources Consulted
- Uvicorn deployment documentation: https://www.uvicorn.org/deployment/
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python fork process model documentation: https://opentelemetry-python.readthedocs.io/en/stable/examples/fork-process-model/README.html
- Gunicorn settings documentation: https://gunicorn.org/reference/settings/
- watchfiles CLI documentation: https://watchfiles.helpmanual.io/cli/
- uvicorn-worker package documentation: https://github.com/Kludex/uvicorn-worker

## Issues Found
- The post incorrectly said `uvicorn --workers` uses `fork()`. Uvicorn's documentation says its built-in worker manager uses Python `spawn`, unlike Gunicorn. I changed the `--workers` explanation to say Uvicorn starts separate worker processes with `spawn`, and moved the fork-specific OpenTelemetry warning to pre-fork servers such as Gunicorn.
- The post described OpenTelemetry failures too absolutely for Uvicorn modes. I softened the introduction to say these modes can make setup confusing and that instrumentation should happen in the process that runs the app.
- The Gunicorn example used `uvicorn.workers.UvicornWorker`, which Uvicorn documents as deprecated. I changed it to `uvicorn_worker.UvicornWorker`, the worker class provided by the separate `uvicorn-worker` package.
- The Gunicorn `post_fork` example configured the tracer provider but did not remind readers that FastAPI itself still needs to be instrumented. I added a short comment noting that `FastAPIInstrumentor.instrument_app(app)` should be used in `main.py`.
- The conclusion said production should always use Gunicorn with Uvicorn workers. I softened this to describe Gunicorn as a common production process-management option, since deployment choices can vary.

## Review Notes
The examples are otherwise syntactically plausible and use current FastAPI lifespan and OpenTelemetry Python APIs. If the Gunicorn example is used as written, `uvicorn-worker` must be present in the application's dependencies.
