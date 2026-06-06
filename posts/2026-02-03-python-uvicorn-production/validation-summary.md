# Validation Summary: How to Use Uvicorn for Production Deployments

## Status
validated

## Post Type
Tutorial / Production deployment guide

## Technologies Covered
- Uvicorn (ASGI server)
- Gunicorn (process manager) + `uvicorn-worker` / legacy `uvicorn.workers`
- FastAPI / Starlette
- Python `ssl` module (TLS configuration)
- Nginx (reverse proxy / SSL termination)
- Docker (multi-stage build), Docker Compose
- Kubernetes (Deployments, probes, lifecycle hooks)
- systemd (service units, socket activation)
- `python-json-logger` (structured logging)

## Sources Consulted
- Uvicorn settings reference: https://uvicorn.dev/settings/
- Uvicorn deployment guide: https://uvicorn.dev/deployment/
- Uvicorn `uvicorn.workers` deprecation PR: https://github.com/Kludex/uvicorn/pull/2302
- `uvicorn-worker` package: https://pypi.org/project/uvicorn-worker/
- `timeout_graceful_shutdown` PR: https://github.com/Kludex/uvicorn/pull/1824
- `h11_max_incomplete_event_size` PRs: https://github.com/Kludex/uvicorn/pull/1514 and https://github.com/Kludex/uvicorn/pull/1534
- FastAPI lifespan events docs: https://fastapi.tiangolo.com/advanced/events/
- Python 3.12 `datetime.utcnow()` deprecation: https://docs.python.org/3/whatsnew/3.12.html
- `python-json-logger` 3.x docs: https://nhairs.github.io/python-json-logger/latest/
- Gunicorn settings: https://docs.gunicorn.org/en/stable/settings.html

## Issues Found

1. **Wrong parameter used for "graceful shutdown timeout"** — The `performance_config.py` example set `timeout_notify=30` with a comment saying "Graceful shutdown timeout". `timeout_notify` is the interval between heartbeat callbacks to the process supervisor, **not** a shutdown timeout. Replaced with `timeout_graceful_shutdown=30`, which is the actual parameter (added in uvicorn PR #1824) for graceful shutdown.

2. **`h11_max_incomplete_event_size` comment was misleading** — This parameter only takes effect with the `h11` HTTP implementation, but the surrounding code uses `http="httptools"`. Updated the comment to clarify the limitation so readers don't expect it to apply to the httptools backend.

3. **`uvicorn.workers.UvicornWorker` is deprecated** — Since Uvicorn 0.30 the `uvicorn.workers` module is deprecated and emits a DeprecationWarning; the recommended replacement is the standalone `uvicorn-worker` package providing `uvicorn_worker.UvicornWorker`. Updated all six occurrences (basic CLI example, `gunicorn.conf.py`, memory-optimized config, Dockerfile CMD, systemd ExecStart, Best Practices snippet) to use `uvicorn_worker.UvicornWorker`, added `uvicorn-worker` to the install command, and called out the deprecation explicitly with the legacy import preserved as a comment for users still on it.

4. **Deprecated FastAPI `@app.on_event` startup/shutdown handlers** — These have been deprecated since FastAPI 0.93.0 (March 2023) in favor of the `lifespan` async context manager, and `lifespan` is the only forward-compatible API. Rewrote the `health.py` example to use `@asynccontextmanager`/`lifespan=lifespan` with the same startup/shutdown semantics.

5. **Deprecated `datetime.utcnow()`** — Deprecated in Python 3.12 with removal planned for 3.14. Replaced both occurrences (in `health.py` and the JSON formatter in `structured_logging.py`) with `datetime.now(timezone.utc)`, which is timezone-aware and produces a correctly-suffixed ISO-8601 string (removing the manual `+ "Z"` workaround in the JSON formatter, since `datetime.now(timezone.utc).isoformat()` already emits a `+00:00` offset).

6. **Deprecated `pythonjsonlogger.jsonlogger.JsonFormatter` import path** — In `python-json-logger` 3.x the public path is `pythonjsonlogger.json.JsonFormatter`; the legacy `pythonjsonlogger.jsonlogger` path is a deprecated shim. Updated the logging config to use the modern path and added a comment for users on 2.x.

7. **Unused `ssl_context` in the direct SSL example** — `uvicorn.run()` does not accept a pre-built `SSLContext` argument; it constructs one internally from the `ssl_keyfile` / `ssl_certfile` / `ssl_ciphers` / `ssl_cert_reqs` / `ssl_ca_certs` / `ssl_keyfile_password` / `ssl_version` parameters. The example created an `ssl.SSLContext`, configured it, and then ignored it — readers would believe their cipher / TLS-version overrides applied when they did not. Replaced with a single `uvicorn.run(...)` call that passes the equivalent settings via the supported keyword arguments (with the mutual-TLS variant kept as inline comments).

## Review Notes

- The "Why Use Gunicorn?" section still applies in 2026: Uvicorn's built-in multiprocess supervisor (`workers=N`) has improved but Gunicorn still offers stronger lifecycle/signal handling, pre-fork model, and broader hook surface.
- The IO-bound `(2 × CPU) + 1` worker formula originates from Gunicorn's docs and is a starting heuristic rather than a hard rule — fine to keep as written.
- The Gunicorn TLS 1.3 cipher example (commented out) lists TLS 1.3 cipher suite names with `ciphers = "TLS_AES_256_GCM_SHA384:..."`. Note that `SSLContext.set_ciphers()` (which gunicorn ultimately calls) does not configure TLS 1.3 ciphersuites — those use `SSL_CTX_set_ciphersuites()` in OpenSSL and are not exposed by Python's `ssl` module pre-3.13. Since the block is fully commented out as an "example", it was left as-is, but readers should be aware that TLS 1.3 cipher selection cannot be done this way.
- `time.time()` is used to measure request duration in the access-logging middleware. `time.monotonic()` would be more correct (not affected by wall-clock adjustments), but `time.time()` is widely used in practice and the post's behavior is functionally fine.
- Pydantic-style `app.add_middleware` and `BaseHTTPMiddleware` usage is current.
- Kubernetes manifest uses `apiVersion: apps/v1` (current) and probe fields (`startupProbe`, `livenessProbe`, `readinessProbe`, `lifecycle.preStop`) are all stable and accurate.
- `worker_tmp_dir = "/dev/shm"` is a real Gunicorn optimization on Linux to avoid disk I/O for the worker heartbeat file.
