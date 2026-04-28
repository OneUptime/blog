# Validation Summary: How to Set Up Nginx Health Checks for IPv4 Upstream Servers

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (open-source) — `ngx_http_upstream_module` (`max_fails`, `fail_timeout`, `proxy_next_upstream`)
- Nginx Plus — `ngx_http_upstream_hc_module` (`health_check` directive, `zone` shared memory)
- `nginx_upstream_check_module` (Yaoweibin third-party module) for active checks on open-source Nginx
- OpenResty / nginx-lua
- Flask (Python) — example `/health` endpoint
- Bash / curl — failover testing and shell health probes
- Nginx Plus REST API (v9)

## Sources Consulted
- Nginx upstream module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx upstream health check (Plus) docs: https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html
- Nginx stub_status module docs: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx Plus API module docs and current API version (9, R31+)
- `nginx_upstream_check_module` README (github.com/yaoweibin/nginx_upstream_check_module)
- Flask documentation for route handlers and `jsonify`

## Issues Found
1. **`max_fails` semantics mischaracterized.** The original comment read `# max_fails=3: mark server down after 3 consecutive failures`. Per the official upstream module docs, `max_fails` counts unsuccessful attempts within the `fail_timeout` window — they are not required to be strictly consecutive. Updated the comment to read `# max_fails=3: mark server down after 3 failures within the fail_timeout window`.
2. **`stub_status` cannot show per-backend state.** The "Monitoring Backend Status" section originally said `View the current state of backends using the stub_status or Nginx Plus API`. The `stub_status` module exposes only aggregate counters (Active connections, accepts, handled, requests, Reading, Writing, Waiting) — it has no per-upstream-server visibility. Rewrote the line to clarify that per-upstream server state requires the Nginx Plus API (or a third-party module) and that `stub_status` is aggregate-only.

## Review Notes
- The `health_check` directive parameters (`interval`, `fails`, `passes`, `uri`) are correct for Nginx Plus and were verified against `ngx_http_upstream_hc_module` docs. Note that `fails`/`passes` in the Plus active check ARE consecutive checks (distinct from `max_fails` semantics) — this is consistent with how the post uses the directive.
- The `nginx_upstream_check_module` syntax shown (`check interval=... rise=... fall=... timeout=... type=http;`, `check_http_send`, `check_http_expect_alive`) matches the upstream README. Worth noting for readers: this module typically requires an Nginx source patch and rebuild and may lag behind current Nginx mainline; for production OpenResty deployments, `lua-resty-upstream-healthcheck` is often a more maintained alternative.
- The Nginx Plus API path `/api/9/...` is current as of R31+. Future readers may need to bump the version number if a newer API version is released.
- The `proxy_next_upstream error timeout http_500 http_502 http_503` configuration is valid; readers should be aware that retrying on `http_500` can mask backend application bugs and may want to scope this carefully in production.
- The Flask example correctly returns `(body, status)` tuple form; the `jsonify` and `Flask` imports are accurate.
