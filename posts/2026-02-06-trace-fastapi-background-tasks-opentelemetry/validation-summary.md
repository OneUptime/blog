# Validation Summary: How to Trace FastAPI Background Tasks with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- FastAPI
- Starlette BackgroundTasks
- OpenTelemetry Python API and SDK
- OpenTelemetry FastAPI/ASGI instrumentation
- AnyIO worker threads
- Python

## Sources Consulted
- FastAPI Background Tasks documentation: https://fastapi.tiangolo.com/tutorial/background-tasks/
- Starlette Background Tasks documentation: https://www.starlette.dev/background/
- Starlette Thread Pool documentation: https://www.starlette.io/threadpool/
- AnyIO Working with threads documentation: https://anyio.readthedocs.io/en/stable/threads.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python cookbook: https://opentelemetry.io/docs/languages/python/cookbook/
- OpenTelemetry FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry ASGI instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/asgi.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The original post overstated that FastAPI background tasks always run in a different execution context and lose OpenTelemetry context without explicit propagation. FastAPI uses Starlette's in-process `BackgroundTasks`; Starlette runs tasks after the response is sent, synchronous tasks use AnyIO's worker thread pool, and AnyIO copies context variables to worker threads. I updated the explanation to say explicit propagation makes the parent relationship predictable and is essential when work moves to separately spawned tasks, queues, or workers.
- The reusable decorator recorded exception attributes after the `start_as_current_span` context manager had already exited, meaning the task span would no longer be current and might already be ended. I moved exception recording inside the span context and disabled automatic exception recording/status setting for that span to avoid duplicate exception events.
- The post did not mention Starlette's ordering behavior for multiple background tasks. I added that tasks run in order and that later tasks are skipped if an earlier task raises.
- The post said background tasks can fail silently. I clarified that failures do not affect the already-sent response, and for multiple Starlette background tasks an exception prevents later tasks from running.

## Review Notes
The installation command, OpenTelemetry tracer provider setup, `FastAPIInstrumentor.instrument_app(app)`, `BackgroundTasks.add_task(...)`, `context.get_current()`, `context.attach(...)`, `context.detach(...)`, `tracer.start_as_current_span(...)`, span attributes, exception recording, and status-setting APIs are consistent with the consulted documentation. The examples are intentionally illustrative and do not pin package versions.
