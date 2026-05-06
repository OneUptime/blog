# Validation Summary: How to Configure Gunicorn for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Gunicorn
- Python
- IPv6
- WSGI
- ASGI
- NGINX
- systemd
- Linux networking

## Sources Consulted
- Gunicorn settings reference: https://gunicorn.org/reference/settings/
- Gunicorn deployment guide: https://gunicorn.org/deploy/
- Gunicorn ASGI worker docs: https://gunicorn.org/asgi/
- Gunicorn 23.0.0 source (`sock.py`): https://raw.githubusercontent.com/benoitc/gunicorn/23.0.0/gunicorn/sock.py
- Gunicorn 23.0.0 source (`util.py`): https://raw.githubusercontent.com/benoitc/gunicorn/23.0.0/gunicorn/util.py
- Gunicorn 23.0.0 source (`http/wsgi.py`): https://raw.githubusercontent.com/benoitc/gunicorn/23.0.0/gunicorn/http/wsgi.py
- Uvicorn docs: https://www.uvicorn.org/
- Uvicorn Worker README: https://github.com/Kludex/uvicorn-worker
- NGINX `listen` directive docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- NGINX upstream module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Linux kernel IP sysctl docs (`bindv6only`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- systemd service docs: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd syntax docs: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html

## Issues Found
- The post treated wildcard IPv4 and wildcard IPv6 binds on the same port as a straightforward dual-stack pattern. Current Gunicorn does not set `IPV6_V6ONLY`, and Linux defaults `net.ipv6.bindv6only` to `0`, so `[::]:8000` may already accept IPv4-mapped connections. I changed the examples to explain that behavior and replaced the conflicting wildcard dual-bind example with explicit IPv4 and IPv6 loopback binds.
- The `gunicorn.conf.py` example used `worker_class = "sync"` together with `threads = 2` and `worker_connections = 1000`. Current Gunicorn documentation says `threads > 1` causes `sync` to switch to `gthread`, and `worker_connections` only applies to certain worker types. I changed the example to `gthread` and clarified which settings apply.
- The access-log explanation incorrectly said `%(h)s` would show the real client IPv6 address behind a proxy. Gunicorn’s deployment docs state that `REMOTE_ADDR` reflects the proxy address, and the real client address should be logged from `X-Forwarded-For`. I updated `access_log_format` to use `%({x-forwarded-for}i)s` and corrected the accompanying explanation.
- The `forwarded_allow_ips` section incorrectly described that setting as trusting `X-Forwarded-For` and replacing the client address for logging. Gunicorn documents `forwarded_allow_ips` as proxy trust for forwarded secure headers such as `X-Forwarded-Proto`. I corrected the explanation and kept the examples focused on proxy IP trust.
- The ASGI example used `uvicorn.workers.UvicornWorker`, which Uvicorn now documents as deprecated. I updated the post to use `uvicorn_worker.UvicornWorker` and noted that the `uvicorn-worker` package should be installed first.
- The troubleshooting section showed an impossible error/fix pairing: it claimed an error on `[::]:8000` but said the fix was to add brackets. I rewrote that note to describe the actual bracket-omission mistake (`:::8000`) without inventing a contradictory error message.
- After correcting the config to bind loopback addresses, the sample `ss` output in the systemd section no longer matched the configuration. I updated the example output to show `[::1]:8000`.

## Review Notes
- Current Gunicorn documentation also includes a native `asgi` worker. I kept the post on the Uvicorn-worker path because the section was explicitly about Uvicorn and that path remains valid after updating the worker import.
- The wildcard IPv6 behavior was additionally spot-checked locally on Linux in this environment. With `net.ipv6.bindv6only = 0`, an IPv6 wildcard listener accepted IPv4 connections as IPv4-mapped IPv6 addresses, and pairing wildcard IPv4 and wildcard IPv6 listeners on the same port failed with `EADDRINUSE`.
