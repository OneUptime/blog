# Validation Summary: How to Send Python Application Logs to OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (standard `logging` module)
- OpenTelemetry (API, SDK, OTLP HTTP exporter, logging instrumentation)
- OTLP (OpenTelemetry Protocol)
- FastAPI (with `FastAPIInstrumentor`)
- Flask (with `FlaskInstrumentor`)
- OneUptime (log/trace ingestion)

## Sources Consulted
- OpenTelemetry Python docs — Logs / Logging SDK: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry Python repo (`opentelemetry-python`) — `opentelemetry.sdk._logs`, `LoggerProvider`, `LoggingHandler`, `BatchLogRecordProcessor`, and `opentelemetry.exporter.otlp.proto.http._log_exporter.OTLPLogExporter` module paths
- Python `logging` module docs — behavior of the `extra` parameter on `Logger.info`/`LogRecord` and reserved record attributes: https://docs.python.org/3/library/logging.html
- Python `datetime` docs — deprecation of `datetime.utcnow()` in Python 3.12: https://docs.python.org/3/library/datetime.html
- FastAPI docs — `HTTPException`, middleware, lifespan: https://fastapi.tiangolo.com/
- Flask docs — `before_request`/`after_request`, `g`, application factory: https://flask.palletsprojects.com/

## Issues Found
1. **Broken `extra` field merge in `StructuredFormatter`** (Structured Logging section). The code used `if hasattr(record, "extra"): log_dict.update(record.extra)`. Python's `logging` module does not store the `extra` dict as `record.extra`; instead each key is set as a direct attribute on the `LogRecord`. As written, the condition was always `False`, so structured fields were never merged into the JSON output — directly contradicting the surrounding prose and inline comment. Fixed by computing the set of standard `LogRecord` attributes and merging any non-standard attributes (the ones supplied via `extra`) into the output dict.
2. **Missing `HTTPException` import in the FastAPI example.** The `get_user` endpoint calls `raise HTTPException(status_code=404, ...)`, but the import line only included `FastAPI, Request`, which would raise `NameError` at runtime. Fixed by adding `HTTPException` to the `from fastapi import ...` line.
3. **Deprecated `datetime.utcnow()`.** Used in the JSON formatter's timestamp. `datetime.utcnow()` is deprecated as of Python 3.12 and produces a naive (timezone-unaware) datetime. Updated to `datetime.now(timezone.utc)` and added `timezone` to the import, which yields a correct timezone-aware ISO-8601 timestamp.

## Review Notes
- The OpenTelemetry package names, import paths (including the underscore-prefixed `opentelemetry.sdk._logs` and `_log_exporter` modules), and the `LoggerProvider` / `BatchLogRecordProcessor` / `LoggingHandler` wiring are all correct for current `opentelemetry-python` releases. The logs API still lives under the experimental `_logs` namespace, so these import paths could change in a future major release.
- The Flask example references `setup_oneuptime_telemetry()`, which is not defined in the snippet; the comment notes it uses "the same config as FastAPI" (where the equivalent helper is named `setup_telemetry()`). This is an intentional "fill in your own" reference rather than a runnable error, so it was left as-is, but readers should reuse/rename the FastAPI helper.
- The OTLP endpoint (`https://otlp.oneuptime.com`) and `Authorization: Bearer <token>` header are illustrative placeholders for OneUptime configuration; readers should substitute the endpoint and auth header from their own OneUptime project settings.
- In `AsyncLoggingHandler`, `import asyncio` and the `BatchLogRecordProcessor` import are unused, and `except:` is a bare except. These are harmless style points, not correctness errors, so they were left unchanged per the "fix only technical errors" guidance.
