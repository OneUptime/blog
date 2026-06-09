# Validation Summary: How to Add Structured Logging to FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (standard library `logging`, `contextvars`, `uuid`, `time`)
- FastAPI
- Starlette (`BaseHTTPMiddleware`)
- structlog
- python-json-logger
- uvicorn (mentioned as dependency)
- Fluentd (configuration snippet)
- Docker / Kubernetes log shipping patterns (DaemonSet, Filebeat, Promtail mentioned at a high level)

## Sources Consulted
- structlog stdlib integration docs: https://www.structlog.org/en/stable/standard-library.html (verified `structlog.stdlib.add_log_level`, `structlog.processors.TimeStamper`, `structlog.processors.format_exc_info`, `structlog.processors.JSONRenderer`, `structlog.dev.ConsoleRenderer`, `structlog.stdlib.ProcessorFormatter.wrap_for_formatter`, `structlog.stdlib.LoggerFactory`, `structlog.stdlib.BoundLogger`)
- python-json-logger docs: https://nhairs.github.io/python-json-logger/latest/quickstart/ and changelog (https://nhairs.github.io/python-json-logger/latest/changelog/)
- FastAPI middleware docs (Starlette `BaseHTTPMiddleware` dispatch signature, `request.client.host`, `request.url.path`, `app.add_middleware`)
- Fluentd `in_tail` and `parser_json` plugin syntax (standard `<source>` / `<parse>` blocks)

## Issues Found
- **python-json-logger import was deprecated.** The post originally used `from pythonjsonlogger import jsonlogger` and `jsonlogger.JsonFormatter(...)`. Since python-json-logger 3.1.0 (2023-05-28) the module was renamed: `pythonjsonlogger.jsonlogger` is now `pythonjsonlogger.json`, and the old import path emits a deprecation warning. Updated the example to use the current recommended import: `from pythonjsonlogger.json import JsonFormatter` and `JsonFormatter(...)` directly. All other parameters (`rename_fields`, `datefmt`, format string) remain valid on the current `JsonFormatter`.

## Review Notes
- The structlog configuration pattern (shared processors used in both `structlog.configure(processors=...)` ending with `wrap_for_formatter`, and in `ProcessorFormatter(foreign_pre_chain=...)`) is the documented integration pattern with stdlib logging. structlog-originated logs go through the shared processors once via `wrap_for_formatter`, and foreign (stdlib) logs go through them via `foreign_pre_chain`; there is no double-processing.
- `BaseHTTPMiddleware` is used as the middleware base class. Starlette docs note caveats around streaming responses and background tasks with this base class, but for the simple request/response logging pattern shown here it is the canonical and documented approach.
- The Fluentd `time_format %Y-%m-%dT%H:%M:%S%z` will parse offsets in the form `+0000` rather than the `Z` produced by `TimeStamper(fmt="iso")` in UTC; Fluentd's JSON parser usually accepts ISO 8601 either way in practice, but readers running strict configurations may want to use `time_type string` + `time_format %iso8601` or normalize timestamps. Not technically wrong — left as written.
- The `dispatch` method's `call_next` parameter is correctly typed implicitly (Starlette's `RequestResponseEndpoint`); leaving the annotation off is valid.
- `request.client` can be `None` (e.g. in some test contexts); the post correctly guards `request.client.host if request.client else None`.
- Log level reference table aligns with Python's stdlib levels (DEBUG/INFO/WARNING/ERROR/CRITICAL).
