# Validation Summary: How to Set Up ClickHouse Behind a Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface, server configuration)
- Nginx (reverse proxy, SSL termination, rate limiting, access control, logging)
- SSL/TLS (certificate configuration, protocol and cipher settings)
- HTTP Basic Authentication (htpasswd, auth_basic)

## Sources Consulted
- Nginx official documentation for `proxy_pass`, `limit_req_zone`, `limit_req`, `allow`/`deny`, `auth_basic`, `ssl_protocols`, `ssl_ciphers`, `log_format` directives — https://nginx.org/en/docs/
- ClickHouse HTTP interface documentation (port 8123, `/ping` endpoint, query parameter usage) — https://clickhouse.com/docs/en/interfaces/http
- ClickHouse server configuration reference (`listen_host` setting) — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- Apache `htpasswd` utility documentation — https://httpd.apache.org/docs/current/programs/htpasswd.html

## Issues Found
- **Summary inconsistency**: The summary stated the reverse proxy approach works "without touching ClickHouse configuration," but the post itself recommends modifying `<listen_host>` in ClickHouse's config to bind to localhost only. Changed "without touching ClickHouse configuration" to "with minimal changes to ClickHouse itself" to accurately reflect the content.

## Review Notes
- The "Restricting Access to Specific Paths" section blocks a `/query` path, but ClickHouse does not actually expose a `/query` endpoint. Queries are sent to `/` via the `query` parameter or POST body. The Nginx syntax is correct and the technique is valid, but readers should note that `/query` is not a real ClickHouse HTTP endpoint. A more practical example would be blocking `/play` (the built-in web UI available in newer ClickHouse versions).
- The reverse proxy config does not forward the `Host` header (`proxy_set_header Host $host;`) or `X-Forwarded-For`/`X-Forwarded-Proto` headers. While ClickHouse's HTTP interface does not require these, they are common best practices for reverse proxy setups and could be useful for logging and diagnostics.
- The `log_format` directive must be placed in the `http` context in Nginx. The snippet does not show the surrounding context, which could cause confusion if a reader places it inside a `server` or `location` block.
