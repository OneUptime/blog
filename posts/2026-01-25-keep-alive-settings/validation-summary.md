# Validation Summary: How to Configure Keep-Alive Settings

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- TCP keep-alive on Linux
- HTTP keep-alive and persistent connections
- Python sockets, requests, urllib3, psycopg2, and redis-py
- Go net and net/http
- NGINX and ingress-nginx
- HAProxy
- Apache HTTP Server
- PostgreSQL/libpq
- Kubernetes Ingress
- Prometheus client metrics

## Sources Consulted
- Linux tcp(7) manual: https://man7.org/linux/man-pages/man7/tcp.7.html
- Python socket documentation: https://docs.python.org/3/library/socket.html
- Go net package documentation: https://pkg.go.dev/net
- Requests HTTPAdapter documentation/source: https://requests.readthedocs.io/en/latest/api/
- urllib3 connection documentation: https://urllib3.readthedocs.io/en/stable/reference/urllib3.connection.html
- redis-py connection documentation: https://redis.readthedocs.io/en/latest/connections.html
- NGINX core module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX log module variables: https://nginx.org/en/docs/http/ngx_http_log_module.html
- NGINX stub_status module: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- Apache HTTP Server core directives: https://httpd.apache.org/docs/current/mod/core.html
- PostgreSQL libpq connection parameters: https://www.postgresql.org/docs/current/libpq-connect.html
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/

## Issues Found
- The Go example used `http.Client` and `http.Transport` without importing `net/http`, passed `nil` as the context to `ListenConfig.Listen`, and declared `package main` without a `main` function. Added `net/http` and `context` imports, used `context.Background()`, and changed the snippet to a helper package so it compiles and follows the documented `Listen(ctx, network, address)` signature.
- The urllib3-backed requests adapter replaced urllib3's default socket options when adding keep-alive options. Updated it to append keep-alive settings to `HTTPConnection.default_socket_options`, preserving urllib3's documented defaults such as TCP_NODELAY.
- The Redis example used raw option numbers `1`, `2`, and `3` for Linux TCP keep-alive options. redis-py expects socket option constants, so the example now imports `socket` and uses `socket.TCP_KEEPIDLE`, `socket.TCP_KEEPINTVL`, and `socket.TCP_KEEPCNT`.
- The NGINX monitoring command parsed the last field of the default access log, which does not reliably indicate connection reuse. Replaced it with a documented custom log format using `$connection` and `$connection_requests`.

## Review Notes
- The TCP keep-alive settings shown are Linux-specific and the post correctly labels the per-socket options as Linux-specific.
- NGINX upstream keep-alive behavior has changed in newer NGINX releases, but the explicit `keepalive`, `proxy_http_version 1.1`, and `proxy_set_header Connection ""` configuration remains valid and portable across commonly deployed versions.
