# Validation Summary: How to Set Up a Python WSGI Application with Gunicorn on Ubuntu

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Python 3 (venv)
- Flask (minimal example)
- Django (referenced for `myproject/wsgi.py` entry point)
- Gunicorn (WSGI server, sync and gevent workers)
- gevent / eventlet (async worker classes)
- Nginx (reverse proxy)
- systemd (service management, `Type=notify`, `RuntimeDirectory`, `ExecReload`)
- Ubuntu

## Sources Consulted
- Gunicorn documentation — Settings: https://docs.gunicorn.org/en/stable/settings.html
- Gunicorn documentation — Deploying: https://docs.gunicorn.org/en/stable/deploy.html
- Gunicorn documentation — Signals: https://docs.gunicorn.org/en/stable/signals.html
- Gunicorn design — worker count formula `(2*CPU)+1`: https://docs.gunicorn.org/en/stable/design.html#how-many-workers
- Flask documentation — Deploying with Gunicorn: https://flask.palletsprojects.com/en/latest/deploying/gunicorn/
- Flask documentation — view function return values (dict → JSON, since Flask 1.1)
- Nginx `ngx_http_proxy_module` — `proxy_pass` with Unix socket: http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- systemd.service manual — `Type=notify`, `RuntimeDirectory`, `ExecReload`: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- PEP 3333 (WSGI) — the WSGI `application` callable convention

## Issues Found
- **systemd `ExecReload` comment mismatch.** The comment read `# Reload workers on SIGUSR2 (zero-downtime deploys)` but the command sends `SIGHUP` (`/bin/kill -s HUP $MAINPID`). In Gunicorn these signals do different things: `SIGHUP` reloads configuration and gracefully restarts workers (what the command actually does), while `SIGUSR2` re-execs the master to upgrade Gunicorn or swap code on the fly. Updated the comment to `# Reload workers on SIGHUP (zero-downtime deploys)` so it matches the command.

## Review Notes
- The Flask example aliases `application = app`. This is not strictly required when the Gunicorn invocation explicitly names the callable (`app:application`); a reader could equivalently run `gunicorn app:app`. The post's `app:application` form together with the alias is internally consistent and correct.
- `worker_connections` is meaningful only for async worker classes (gevent / eventlet / tornado); setting it under `worker_class = "sync"` is harmless and the inline comment already notes this.
- `Type=notify` works because Gunicorn (since 19.x) detects `NOTIFY_SOCKET` and sends `READY=1` / `RELOADING=1` / `STOPPING=1` to systemd natively — no extra flag needed.
- `proxy_pass http://unix:/run/gunicorn/myapp.sock;` is the form widely used in production configs and works with current Nginx; the documented canonical form `http://unix:/path:/uri` is equivalent when no rewrite URI is desired.
- `RuntimeDirectory=gunicorn` already creates `/run/gunicorn` (owned by the service `User`/`Group`) on each start, so the `mkdir -p /run/gunicorn` + `chown` step earlier in the guide is technically redundant but does no harm and helps when running Gunicorn outside systemd for the manual-test step.
- The Nginx `proxy_read_timeout`/`proxy_connect_timeout` of 35s is correctly noted as `>=` Gunicorn's `timeout` of 30s, which is the right relationship to avoid Nginx timing out before Gunicorn kills a slow worker.
- `ss -x | grep gunicorn` matches the socket path (`/run/gunicorn/myapp.sock`), not the process name — this works because the path contains the string `gunicorn`.
