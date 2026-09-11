# Preserve Correlation IDs Across FastAPI and Celery Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Python, FastAPI, Celery, Logging

Description: Use Python contextvars for request-local logging and serialize correlation metadata into Celery headers, with explicit restoration and cleanup in workers.

---

Python `contextvars` can keep concurrent FastAPI requests from overwriting each other's logging context. That context stops at the process boundary: a Celery worker must receive the ID in the task message and establish its own scope.

Treat the flow as three explicit steps: generate or validate the ID in the web application, serialize it when submitting the task, and set/reset it while executing the task. The worker's task ID remains a separate identifier for Celery execution.

## Define a shared context module

Create `correlation.py` containing the context variable and validation policy:

```python
import contextvars
import re
from uuid import uuid4

correlation_id = contextvars.ContextVar("correlation_id", default=None)
_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")

def normalize(value):
    if isinstance(value, str) and _PATTERN.fullmatch(value):
        return value
    return uuid4().hex
```

The default is `None`, so logs outside a request do not inherit a fabricated value. The format is an application contract. It is intentionally narrow, bounded, and free of whitespace and control characters.

Python's [contextvars documentation](https://docs.python.org/3/library/contextvars.html) describes the token returned by `set` and how `reset` restores the previous value. Always retain the token; assigning `None` afterward is not equivalent when scopes are nested.

## Set and reset context in FastAPI

In `web.py`, generate a public request ID and pass it through task headers:

```python
import asyncio
from uuid import uuid4
from fastapi import FastAPI
from correlation import correlation_id
from tasks import generate_report

app = FastAPI()

@app.middleware("http")
async def correlation_middleware(request, call_next):
    value = uuid4().hex
    token = correlation_id.set(value)
    try:
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = value
        return response
    finally:
        correlation_id.reset(token)

@app.post("/reports/{report_id}", status_code=202)
async def submit_report(report_id: str):
    value = correlation_id.get()
    result = await asyncio.to_thread(
        generate_report.apply_async,
        args=[report_id],
        headers={"x-correlation-id": value},
    )
    return {"task_id": result.id, "correlation_id": value}
```

`apply_async` publishes through a synchronous broker client. Moving publication into `asyncio.to_thread` avoids blocking the web event loop while the broker responds. The header value is captured before crossing that boundary.

This example owns ID generation at the public web boundary. Behind an authenticated gateway, you can replace generation with validated extraction. A format check alone does not make an arbitrary caller's chosen ID trustworthy.

The middleware sets the header on responses that return through `call_next`. If you need guaranteed headers on outer server error responses or all streaming behavior, implement and test an outer ASGI middleware layer as part of your response policy. That is separate from transferring task context.

## Restore the ID for each Celery task

Create `tasks.py`:

```python
import json
import os
from celery import Celery
from correlation import correlation_id, normalize

celery = Celery("reports", broker=os.environ["CELERY_BROKER_URL"])

def log(event, **fields):
    print(json.dumps({
        **fields,
        "event": event,
        "correlation_id": correlation_id.get(),
    }), flush=True)

@celery.task(bind=True)
def generate_report(self, report_id):
    headers = self.request.headers or {}
    value = normalize(headers.get("x-correlation-id"))
    token = correlation_id.set(value)
    try:
        log("report.started", task_id=self.request.id, report_id=report_id)
        # Replace this deterministic result with the report processor.
        result = {"report_id": report_id, "status": "ready"}
        log("report.completed", task_id=self.request.id)
        return result
    except Exception:
        log("report.failed", task_id=self.request.id)
        raise
    finally:
        correlation_id.reset(token)
```

Use a configured broker and start the two processes:

```bash
celery -A tasks.celery worker --loglevel=INFO
uvicorn web:app --port 8000
```

Install FastAPI, Uvicorn, and Celery with the transport dependencies needed by your broker. The example does not configure a result backend, so use logs or your application's durable job record to track completion rather than assuming the returned result is queryable.

Use `x-correlation-id` as the custom transport key. Celery reserves `correlation_id` in its task request/message properties, so a custom header with that name is filtered out of `request.headers`. The [Celery request implementation](https://docs.celeryq.dev/en/stable/_modules/celery/app/task.html) shows that filtering. Keep the Python variable and log field named `correlation_id`; only the transport header needs the distinct name.

Celery exposes custom request headers through the bound task request. Its [task documentation](https://docs.celeryq.dev/en/stable/userguide/tasks.html) and [calling guide](https://docs.celeryq.dev/en/stable/userguide/calling.html) describe the request and publication APIs.

## Keep task, workflow, and attempt identity distinct

A task ID is useful for Celery's lifecycle. The application correlation ID can join a web request with multiple tasks. If a task creates another task, pass the correlation header explicitly and include a causation field identifying the producer task when lineage matters.

Do not assume every chain, chord, retry, or custom publishing path preserves custom headers in the way your application needs. Test the actual Celery version and canvas pattern. When adding retry logic, verify the metadata of the retried message and record the attempt count separately.

Keep trace propagation independent. Serialize W3C context with the OpenTelemetry propagator if tracing crosses the broker. Copying `correlation_id` into a task header does not create a producer/consumer span relationship.

## Verify process isolation and cleanup

Submit several reports concurrently and compare each returned ID with its worker start and completion records. Send a task without headers and another with malformed metadata; both should get a valid generated worker ID without breaking execution.

Force the processor to raise, then run another task on the same worker process. The second task must never inherit the first task's ID. Also verify any alternate concurrency pool you actually deploy rather than assuming all thread, greenlet, and process configurations behave identically.

## Conclusion

Use `contextvars` for local execution scope and Celery headers for process transfer. Capture the ID when publishing, restore it per task, and reset it in `finally`. Keep task identity, retry attempts, and trace context explicit so correlation survives both concurrency and worker reuse.

## Official Documentation

- [Python contextvars](https://docs.python.org/3/library/contextvars.html)
- [FastAPI middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
- [Celery task requests](https://docs.celeryq.dev/en/stable/userguide/tasks.html)
- [Celery task publication](https://docs.celeryq.dev/en/stable/userguide/calling.html)
