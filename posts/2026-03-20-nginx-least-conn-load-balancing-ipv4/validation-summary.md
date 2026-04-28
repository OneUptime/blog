# Validation Summary: How to Configure Nginx least_conn Load Balancing with IPv4 Backends

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (open-source) HTTP upstream / load balancing
- `ngx_http_upstream_module` directives: `least_conn`, `server`, `keepalive`, `weight`, `max_fails`, `fail_timeout`, `backup`
- `ngx_http_proxy_module` directives: `proxy_pass`, `proxy_set_header`, `proxy_http_version`
- `ngx_http_stub_status_module` (`stub_status`)
- Nginx Plus (active health checks, mentioned for comparison)

## Sources Consulted
- Official Nginx docs — `ngx_http_upstream_module`: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Official Nginx docs — `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Official Nginx docs — `ngx_http_stub_status_module`: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx admin guide on HTTP load balancing: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/

## Issues Found
1. **Incorrect inline comment for `keepalive 32`** — The original comment read: `# Maintain up to 32 idle connections per worker to each backend`. This is wrong. According to the official `ngx_http_upstream_module` docs, the `keepalive` parameter sets the maximum number of idle keepalive connections preserved in the cache of each worker process *in total across all upstream servers*, not per backend. The comment was changed to: `# Max idle keepalive connections cached per worker (total across upstream)`.

## Review Notes
- The list of supported load balancing algorithms (round-robin default, `least_conn`, `ip_hash`, `hash`, `random`) is accurate. `random` was added in Nginx 1.15.1 and is now a stable feature.
- `least_conn` correctly takes server weights into account (per upstream module docs), so combining it with `weight=` parameters is valid.
- `max_fails=3` description ("Mark server as down after 3 consecutive failures") is a slight simplification — the failures must occur within the `fail_timeout` window rather than being strictly consecutive — but the practical meaning is acceptable for an introductory tutorial and not technically incorrect for the typical case.
- `fail_timeout` plays a dual role (counting window AND unavailability duration); the post's "Time before retrying a failed server" wording captures the user-facing behavior accurately enough.
- `backup` is supported in open-source Nginx and works with `least_conn`. Worth noting (not added to the post): `backup` is incompatible with `hash`, `ip_hash`, and `random` load balancing methods, but those aren't used in the examples.
- `proxy_http_version 1.1;` and `proxy_set_header Connection "";` are correctly required for upstream keepalive.
- `stub_status` syntax is current (no `on` argument needed since Nginx 1.7.5).
- The `stub_status` server example listens on `127.0.0.1:8080`, which would conflict with the upstream backends only if any of them happened to be on the same host — in this example they are remote (`10.0.1.x`), so there is no conflict. Not flagged as an error.
- Active health checks (`health_check` directive) are indeed Nginx Plus only; the open-source path is passive checks via `max_fails`/`fail_timeout`, as the post correctly states.
