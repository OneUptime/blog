# Validation Summary: How to Deploy FastAPI to Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3.11
- FastAPI 0.109.0
- Uvicorn 0.27.0 (with `uvicorn[standard]`)
- Gunicorn 21.2.0
- Docker (multi-stage builds)
- Nginx (reverse proxy, SSL termination, load balancing)
- Let's Encrypt / Certbot
- Pydantic / pydantic-settings v2
- systemd
- PostgreSQL (referenced via `libpq`)

## Sources Consulted
- Gunicorn settings documentation: https://docs.gunicorn.org/en/stable/settings.html
- Gunicorn deployment / systemd example: https://docs.gunicorn.org/en/stable/deploy.html
- Gunicorn design (workers recommendation): https://docs.gunicorn.org/en/latest/design.html
- Uvicorn deployment docs: https://www.uvicorn.org/deployment/
- Pydantic Settings v2 docs: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- FastAPI lifespan docs: https://fastapi.tiangolo.com/advanced/events/
- Python `datetime` deprecation notice (3.12 release notes): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- MDN: X-XSS-Protection (deprecated): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- Nginx upstream / proxy module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Docker HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Certbot user guide: https://eff-certbot.readthedocs.io/

## Issues Found
1. **`datetime.utcnow()` deprecation** — In the `health.py` example, `datetime.utcnow()` was used in five places. This API is deprecated in Python 3.12+ and scheduled for removal. Replaced all occurrences with `datetime.now(timezone.utc)` and added `timezone` to the import. This also produces timezone-aware ISO timestamps, which is preferable for `/health` responses.

2. **Unused `asyncpg` import** — The `health.py` example imported `asyncpg` but never used it. Since `asyncpg` was not declared in `requirements.txt`, this would cause an `ImportError` at startup for anyone copying the snippet verbatim. Removed the import.

3. **Deprecated pydantic-settings `class Config:` pattern** — The settings example used the legacy nested `class Config:` pattern, which is deprecated in Pydantic v2 / pydantic-settings v2 (will be removed in Pydantic v3). Replaced with the recommended `model_config = SettingsConfigDict(...)` form and added `SettingsConfigDict` to the import.

4. **Obsolete `X-XSS-Protection` header** — The Nginx config set `X-XSS-Protection "1; mode=block"`. This header is deprecated; the XSS Auditor it referenced has been removed from all major browsers (Chrome dropped it in v78, Edge followed, Firefox/Safari never implemented it). MDN now recommends not relying on it. Replaced with `Referrer-Policy "strict-origin-when-cross-origin"`, a security header that is genuinely useful in 2026.

## Review Notes
- **`uvicorn.workers.UvicornWorker` is deprecated as of Uvicorn 0.30+** in favor of the standalone `uvicorn-worker` package (`pip install uvicorn-worker`, then `uvicorn_worker.UvicornWorker`). However, the post pins `uvicorn==0.27.0` (January 2024), where `uvicorn.workers.UvicornWorker` is still the canonical path and emits no warning. The internal consistency between the pinned version and the worker path is correct, so no change was made. Readers upgrading uvicorn past 0.30 should switch to the new package.
- The Dockerfile uses `FROM ... as builder` (lowercase `as`). Recent BuildKit emits a warning recommending uppercase `AS`. Functionally equivalent, no fix made.
- The Gunicorn `(2 x CPU) + 1` worker rule is still the official Gunicorn recommendation.
- The systemd `Type=notify` choice is correct — Gunicorn ships its own `sd_notify` implementation (`gunicorn/systemd.py`) since 20.0, so no external `python-systemd` package is required. Adding `NotifyAccess=main` would be a minor robustness improvement but is not required.
- The pinned package versions (FastAPI 0.109.0, Uvicorn 0.27.0, Gunicorn 21.2.0, python-dotenv 1.0.0) are all from late-2023/early-2024 and are valid, but readers in 2026 should consider upgrading — particularly Gunicorn (22.x/23.x released since), where 22.0.0 fixed a request-smuggling CVE (CVE-2024-1135).
- `preload_app = True` combined with Uvicorn workers can cause issues if any module-level code opens resources (event loops, DB pools, file handles) that don't survive `fork()`. The post correctly notes the copy-on-write tradeoff but doesn't flag the fork-safety caveat. Worth mentioning in a future revision, not a correctness issue.
