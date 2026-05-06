# Validation Summary: How to Set Up Caddy as a Reverse Proxy with Automatic HTTPS for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Caddy
- Caddyfile
- Reverse proxying
- HTTPS/TLS
- Load balancing
- HTTP header handling
- Caddy admin API
- systemd

## Sources Consulted
- Caddy Install docs: https://caddyserver.com/docs/install
- Caddy `reverse_proxy` directive docs: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy `handle` directive docs: https://caddyserver.com/docs/caddyfile/directives/handle
- Caddy `bind` directive docs: https://caddyserver.com/docs/caddyfile/directives/bind
- Caddy `tls` directive docs: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy Automatic HTTPS docs: https://caddyserver.com/docs/automatic-https
- Caddy `basic_auth` directive docs: https://caddyserver.com/docs/caddyfile/directives/basic_auth
- Caddy command-line reference: https://caddyserver.com/docs/command-line
- Caddy API docs: https://caddyserver.com/docs/api

## Issues Found
- The Debian/Ubuntu install snippet omitted `curl` and the `chmod` steps shown in the official package-install instructions. I added `curl` to the prerequisite package list, added the two permission commands, and made the final `apt-get install` non-interactive.
- The reverse proxy header example manually overwrote `X-Forwarded-For` and `X-Forwarded-Proto`, but Caddy already sets `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` automatically. I removed those overrides and kept only the explicit `X-Real-IP` example.
- The internal HTTPS section described `tls internal` as self-signed and stated that Caddy trusts it on the system without qualification. I corrected this to describe Caddy's internal CA accurately and noted that trust-store installation is attempted automatically but may require running `caddy trust`.
- The authentication section used the deprecated `basicauth` directive name and included a malformed example hash. I updated it to `basic_auth`, replaced the hash with a valid example format, and removed the inaccurate "Rate Limiting" wording from the section title because no rate-limiting example was present.
- The validation and reload commands referenced a Caddyfile path without explicitly specifying the config adapter. I added `--adapter caddyfile` to align the commands with the current CLI documentation for non-JSON config files.

## Review Notes
- The public automatic-HTTPS examples are technically correct, but they still depend on normal ACME prerequisites: the hostname must resolve to the Caddy server and ports 80 and 443 must be reachable.
- `basic_auth` still supports bcrypt and defaults to it, so the corrected example is valid. Current Caddy docs also document `argon2id` as the modern option if the post is expanded later.
