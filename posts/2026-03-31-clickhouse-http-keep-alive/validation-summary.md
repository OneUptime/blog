# Validation Summary: How to Configure ClickHouse HTTP Keep-Alive Settings

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (HTTP interface, server config, system tables)
- HTTP keep-alive / persistent connections
- Python `requests` library (Session-based connection reuse)
- Go `net/http` (`http.Transport`, `http.Client`)
- Nginx (upstream `keepalive`, `proxy_http_version`)
- Linux `ss` utility

## Sources Consulted
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings (sections `keep_alive_timeout`, `max_keep_alive_requests`, `http_server_default_response`)
- ClickHouse `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse `system.opentelemetry_span_log`: https://clickhouse.com/docs/operations/system-tables/opentelemetry_span_log
- Python Requests Sessions docs: https://requests.readthedocs.io/en/latest/user/advanced/#session-objects
- Go `net/http` `Transport` docs: https://pkg.go.dev/net/http#Transport
- Nginx `ngx_http_upstream_module` (`keepalive`): https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive
- `ss` man page (iproute2)

## Issues Found
1. **Incorrect claim that `max_keep_alive_requests` does not exist.** In the "Setting Maximum Requests Per Connection" section, the original XML snippet duplicated `<keep_alive_timeout>` and the prose asserted that ClickHouse does not expose a separate `max_keep_alive_requests` setting. In fact, `max_keep_alive_requests` is a documented server-level setting (https://clickhouse.com/docs/operations/server-configuration-parameters/settings#max_keep_alive_requests). Replaced the snippet with `<max_keep_alive_requests>10000</max_keep_alive_requests>` and rewrote the prose to describe the real behavior.
2. **Invalid `system.opentelemetry_span_log` query.** The original SQL referenced `http_method`, `http_uri`, and `finish_time` as direct columns. None of those are direct columns in `system.opentelemetry_span_log` — HTTP attributes live in the `attribute` Map and the time column is `finish_time_us`. Rewrote the query to target `system.query_log`, which does expose `http_method` and `http_user_agent` as first-class columns and uses `event_time` for filtering (also added `type = 'QueryFinish'` and `http_method > 0` to filter meaningful HTTP traffic).

## Review Notes
- The `keep_alive_timeout` example value of 10 seconds in the "Default Keep-Alive Settings" section matches the XML example on the ClickHouse docs page; the current source-code default is 30 seconds, but the docs page does not explicitly label either value as "the default," so the post was left as-is.
- The `http_server_default_response` entry in the "Configuring Keep-Alive Timeout" XML snippet is unrelated to keep-alive (it controls the body returned for `/`), but it's a valid setting, so it was left in place to preserve the author's intent.
- Python `requests.Session` does reuse connections via `urllib3`'s connection pool automatically; the explicit `Connection: keep-alive` header is not required (HTTP/1.1 defaults to keep-alive) but is harmless.
- Go example is correct; `IdleConnTimeout` shorter than the server's `keep_alive_timeout` is the right mitigation for connection-reset races.
- Nginx snippet is correct: `keepalive` in the upstream plus `proxy_http_version 1.1` and clearing the `Connection` header are the standard requirements for upstream keep-alive.
- `ss` command syntax is valid.
