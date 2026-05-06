# Validation Summary: How to Configure Caddy as an IPv6 Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Caddy
- Caddyfile
- Caddy JSON config and admin API
- IPv6 networking
- Reverse proxying and load balancing
- Automatic HTTPS
- `caddy-ratelimit` plugin

## Sources Consulted
- Caddy docs: Caddyfile Concepts: https://caddyserver.com/docs/caddyfile/concepts
- Caddy docs: Global options (`default_bind`, `trusted_proxies`): https://caddyserver.com/docs/caddyfile/options
- Caddy docs: `bind` directive: https://caddyserver.com/docs/caddyfile/directives/bind
- Caddy docs: `reverse_proxy` directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy docs: `log` directive: https://caddyserver.com/docs/caddyfile/directives/log
- Caddy docs: Automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Caddy docs: API: https://caddyserver.com/docs/api
- Caddy docs: Network address conventions: https://caddyserver.com/docs/conventions
- `mholt/caddy-ratelimit` README: https://github.com/mholt/caddy-ratelimit

## Issues Found
- The post used unbracketed IPv6 addresses in `default_bind`, `bind`, and `bind ::`. Caddy's network-address documentation requires IPv6 addresses to be written in brackets, so I corrected those examples to `[2001:db8::1]` and `[::]`.
- The `default_bind` example implied that Automatic HTTPS's HTTP redirect/challenge listener would inherit the bind address automatically. Caddy's global-options docs say the runtime-created HTTP server does not inherit `default_bind` unless an explicit `http://` site exists, so I added the empty `http://app.example.com` block.
- The reverse-proxy examples manually overwrote `X-Forwarded-For` and used `{remote_host}` as if it were the parsed real client IP behind trusted proxies. Caddy already sets or augments `X-Forwarded-*` headers by default, and the real client IP parsed from trusted proxy headers is exposed as `{client_ip}`, so I removed the manual `X-Forwarded-For` override and changed the `X-Real-IP` example to use `{client_ip}`.
- The trusted-proxy example contained an invalid IPv6 CIDR example, `2001:db8:lb::/48`, which is not valid hexadecimal IPv6 notation. I replaced it with the valid documentation-safe example `2001:db8:100::/48`.
- The `caddy-ratelimit` example used unsupported shorthand syntax, `zone dynamic {remote_host} 100r/m`. The plugin's documented Caddyfile syntax requires a named `zone` block with `key`, `events`, and `window`, so I updated the snippet accordingly.
- The JSON example manually rewrote `X-Forwarded-For` and `X-Real-IP` from `{http.request.remote.host}`, which bypasses trusted-proxy parsing and is unnecessary because Caddy's reverse proxy already manages `X-Forwarded-*` headers. I removed those overrides and simplified the listener to the documented `listen: [":443"]` form.
- I tightened the verification commands so the access-log check targets Caddy's actual JSON log fields (`remote_ip` and `client_ip`) instead of a broad IPv6 regex.

## Review Notes
- If Caddy is behind append-style load balancers or CDNs, the official docs recommend `trusted_proxies_strict` so `X-Forwarded-For` is parsed right-to-left safely.
- The `caddy` binary was not available in the review environment, so validation was performed against the current official documentation and the plugin's authoritative README rather than by running `caddy adapt` locally.
