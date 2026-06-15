# Validation Summary: How to Configure Remote Device Monitoring

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Python
- asyncio
- aiohttp
- FastAPI
- Pydantic
- psutil
- Python dataclasses
- Python logging, gzip, json, and statistics modules
- IoT and edge device monitoring concepts

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python json documentation: https://docs.python.org/3/library/json.html
- Python asyncio event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python statistics documentation: https://docs.python.org/3/library/statistics.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- psutil documentation: https://psutil.readthedocs.io/
- aiohttp client documentation: https://docs.aiohttp.org/en/stable/client_quickstart.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- FastAPI JSON compatible encoder documentation: https://fastapi.tiangolo.com/tutorial/encoder/
- Pydantic serialization documentation: https://docs.pydantic.dev/latest/concepts/serialization/

## Issues Found
- The monitoring agent built its outgoing payload with `asdict(metrics)` and `[asdict(m) for m in custom_metrics]`, which left nested `datetime` objects in the structure passed to `aiohttp`'s `json=` parameter. Python's standard JSON encoder does not serialize `datetime` objects by default, so the send would fail at runtime. Updated the payload construction to convert nested metric timestamps to ISO 8601 strings.
- The snippets used `datetime.utcnow()`, which is deprecated in modern Python because it returns a naive datetime. Replaced those calls with `datetime.now(timezone.utc)` and updated imports accordingly.
- The FastAPI server used `payload.dict()` and `payload.system.dict()`, which are deprecated Pydantic v1-style APIs under Pydantic v2. Replaced them with `model_dump(mode="json")` so stored values are JSON-compatible.
- The FastAPI server used `@app.on_event("startup")`, which FastAPI now documents as the deprecated startup/shutdown event style. Replaced it with a lifespan context manager that starts and cancels the background offline-device task.
- The server model omitted the `load_average` field produced by the agent's system metrics payload. Added `load_average: Optional[tuple] = None` so the documented payload is represented by the ingestion model.
- The connectivity monitor used `asyncio.get_event_loop().time()` inside a coroutine. Updated it to `asyncio.get_running_loop().time()`, which is the clearer current API for retrieving the active loop in async code.
- The latency p95 calculation used `statistics.quantiles(history, n=100)` with the default exclusive method. For small rolling sample sets this can extrapolate beyond observed values. Updated it to `method="inclusive"` for a bounded percentile estimate from observed samples.

## Review Notes
The snippets are illustrative and still use in-memory storage and simple threshold checks, which the post clearly labels as simplified or production placeholders. All Python code blocks were extracted and compiled successfully after the fixes.
