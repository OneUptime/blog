# Validation Summary: How to Configure Kong API Gateway for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kong Gateway 3.x (Docker and bare-metal)
- NGINX listener syntax (IPv6 `[::]:port`)
- Kong declarative DB-less configuration (YAML, `_format_version: "3.0"`)
- Kong Admin API
- Kong rate-limiting plugin
- `curl`, `ss`, `netstat` for verification

## Sources Consulted
- Kong Gateway configuration reference: https://developer.konghq.com/gateway/configuration/
- Kong rate-limiting plugin reference: https://developer.konghq.com/plugins/rate-limiting/
- Kong rate-limiting plugin schema (master): https://github.com/Kong/kong/blob/master/kong/plugins/rate-limiting/schema.lua
- Kong DB-less / declarative configuration docs (referenced via Kong developer hub)

## Issues Found

1. **Non-existent `KONG_PROXY_LISTEN_SSL` env var / `proxy_listen_ssl` directive.** The original post used a separate `KONG_PROXY_LISTEN_SSL` environment variable and a `proxy_listen_ssl` line in `kong.conf`. Neither exists in Kong. According to Kong's configuration reference, SSL listeners are configured by appending the `ssl` suffix to entries inside the single `proxy_listen` directive (and likewise via `KONG_PROXY_LISTEN`). Fixed by folding the SSL listeners into `KONG_PROXY_LISTEN` / `proxy_listen` using the `... 0.0.0.0:8443 ssl, [::]:8443 ssl` form, and added a missing `-p 8443:8443` Docker port mapping for the HTTPS port.

2. **Bash comments inside a backslash-continued `docker run` command.** The original example placed `# ...` lines between continuation lines. After bash collapses `\<newline>`, a `#` preceded by whitespace starts a real comment, terminating the `docker run` invocation prematurely and causing the next `-e ...` line to be executed as its own (failing) command. Replaced the inline comments with comments placed before the command, where they are safe.

3. **Invalid `#` comments inside JSON.** The Step 5 `curl -X POST .../plugins` body contained `# Use remote IP ...` inside the JSON document. JSON does not support comments, and because the body is in single quotes the `#` is sent literally to Kong, which would reject the request with a JSON parse error. Removed the in-JSON comment and moved the explanatory note to the bash comment above the command.

## Review Notes
- `limit_by: "ip"` was verified against the rate-limiting plugin schema (allowed values: `consumer`, `credential`, `ip`, `service`, `header`, `path`).
- The Kong service `host` field accepts a bare IPv6 address (no brackets) when the port is given separately, while upstream `target` values use the combined `[ipv6]:port` bracket form. The post's usage matches both conventions.
- The `kong:3.6` Docker tag is valid but slightly behind the current Kong 3.x line; readers may wish to use a newer 3.x tag, but no functional change is required.
- `_format_version: "3.0"` is a valid declarative config format version for Kong 3.x.
- `stream_listen` is correct for Kong's TCP/UDP stream proxy; left unchanged.
