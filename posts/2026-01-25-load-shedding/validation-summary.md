# Validation Summary: How to Configure Load Shedding

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Python
- FastAPI
- Starlette middleware
- psutil
- Kubernetes Deployments and readiness probes
- Circuit breaker pattern
- Prometheus Python client metrics

## Sources Consulted
- FastAPI Middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- FastAPI Lifespan Events documentation: https://fastapi.tiangolo.com/advanced/events/
- Starlette Exceptions documentation: https://starlette.dev/exceptions/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- psutil documentation: https://psutil.readthedocs.io/stable/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Python client labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/

## Issues Found
- The queue-based FastAPI middleware raised `HTTPException` directly from middleware. Starlette documents that middleware should return responses directly, so the snippet now returns `JSONResponse` with status 503 and `Retry-After`.
- The request priority header parsing could raise `KeyError` for an invalid header value. It now falls back to `Priority.NORMAL`.
- The CPU-based FastAPI example used deprecated `@app.on_event("startup")`. It now uses FastAPI's recommended lifespan context manager.
- The CPU sampler used `psutil.cpu_percent(interval=None)` without priming it. psutil documents the first non-blocking reading as meaningless, so the snippet now primes the sampler before monitoring.
- The CPU and adaptive FastAPI snippets referenced `FastAPI`, `Request`, and `JSONResponse` without importing them. The missing imports and app initialization were added.
- The Kubernetes `apps/v1` Deployment snippet omitted `.spec.selector` and matching pod template labels. Kubernetes requires the selector and requires it to match `.spec.template.metadata.labels`, so both were added.
- The readiness endpoint returned `JSONResponse` without importing it and referenced an undefined `request_queue`. The snippet now imports `JSONResponse` and uses a small placeholder function for the application queue/backlog metric.
- The circuit breaker allowed one extra request when transitioning from open to half-open because the first half-open request was not counted. The transition now initializes `half_open_requests` to `1`.
- The Prometheus metrics middleware called the async shedder without `await`, referenced undefined attributes, and raised `HTTPException` from middleware. It now awaits the shedder, returns `JSONResponse`, and derives queue depth and accept rate from `get_stats()`.

## Review Notes
The examples are still illustrative and omit production concerns such as multi-process shared state, distributed load-shedding coordination, cancellation of background monitor tasks, and using rolling/windowed failure rates for circuit breakers. The edited snippets parse syntactically, and the Kubernetes YAML parses as YAML.
