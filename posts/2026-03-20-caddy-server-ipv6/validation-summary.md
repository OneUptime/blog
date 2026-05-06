# Validation Summary: How to Configure Caddy Server for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Caddy
- Caddyfile
- Caddy JSON configuration
- IPv6 networking
- Reverse proxying
- Automatic HTTPS
- Linux networking tools (`ss`, `journalctl`, `curl`)

## Sources Consulted
- Caddyfile Concepts: https://caddyserver.com/docs/caddyfile/concepts
- `bind` directive: https://caddyserver.com/docs/caddyfile/directives/bind
- `reverse_proxy` directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- `tls` directive: https://caddyserver.com/docs/caddyfile/directives/tls
- Automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Global options: https://caddyserver.com/docs/caddyfile/options
- Conventions / network addresses: https://caddyserver.com/docs/conventions
- `log` directive: https://caddyserver.com/docs/caddyfile/directives/log
- How Logging Works: https://caddyserver.com/docs/logging

## Issues Found
- The post used Caddy site addresses such as `[::]:80` and `[::]:443` as if they only controlled socket binding. In Caddy, site addresses also act as host/IP matchers. I changed those examples to use the documented `bind` directive, and used `tcp6/[::]` where the intent was an IPv6-only listener.
- The dual-stack example used wildcard-style addressing in a way that could be misleading at the socket level. I changed it to bind specific IPv4 and IPv6 example addresses in the documented `bind` form.
- The single-backend reverse proxy example enabled `tls { on_demand }`, which is unrelated to IPv6 and is insecure in production unless `on_demand_tls` is also configured globally. I removed it.
- The JSON listener example combined `:443` and `[::]:443`. I changed it to a single explicit IPv6 listener, `tcp6/[::]:443`, to match the article's intent.
- The Automatic HTTPS section incorrectly said both `A` and `AAAA` records are required. Caddy's docs say `A/AAAA` records should point to the server as appropriate. I corrected this to require an `AAAA` record for IPv6, with `A` only if IPv4 is also served.
- The proxy-header example manually overwrote `X-Forwarded-For` and `X-Forwarded-Proto`, but Caddy already sets `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` by default. I corrected the snippet to only add `X-Real-IP` when needed.
- The logging example implied access logs are always available and used `remote_addr`, which does not match Caddy's documented structured access log fields. I corrected it to note that access logging must be enabled and updated the example to `request.remote_ip` / `client_ip`.
- The IPv6-only deployment example used `default_bind [::]` as if that alone disabled IPv4 listeners. I replaced it with explicit `bind tcp6/[::]` on the HTTP and HTTPS site blocks so the IPv6-only intent is clear and accurate.

## Review Notes
- The examples use documentation-only addresses from `2001:db8::/32` and `192.0.2.0/24`; they must be replaced with real addresses in an actual deployment.
- I could not run `caddy adapt` or live-validate the configs locally because `caddy` is not installed in this environment.
