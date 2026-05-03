# Validation Summary: How to Deploy Caddy via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Caddy v2 (web server / reverse proxy)
- Caddyfile configuration syntax
- Portainer (Docker stack management UI)
- Docker / Docker Compose
- Let's Encrypt (automatic HTTPS / ACME)
- HTTP/3 (QUIC)
- Third-party Caddy plugin: `github.com/mholt/caddy-ratelimit`

## Sources Consulted
- Official Caddy documentation: https://caddyserver.com/docs/
- Caddyfile directives reference: https://caddyserver.com/docs/caddyfile/directives
- `redir` directive docs: https://caddyserver.com/docs/caddyfile/directives/redir
- Caddy CLI reference: https://caddyserver.com/docs/command-line
- Caddy Docker Hub page: https://hub.docker.com/_/caddy
- Caddy source code (autohttps.go) for HTTP-to-HTTPS redirect status code
- Third-party rate-limit module README: https://github.com/mholt/caddy-ratelimit
- xcaddy build tool: https://github.com/caddyserver/xcaddy

## Issues Found

1. **Incorrect HTTP-to-HTTPS redirect status code.** The "Verifying HTTPS" section claimed `curl -I http://...` returns `301 Moved Permanently`. Caddy v2's automatic HTTPS redirect actually uses `308 Permanent Redirect` (per `modules/caddyhttp/autohttps.go`, which uses `http.StatusPermanentRedirect`). Updated the comment to `308 Permanent Redirect → https://`.

2. **`rate_limit` directive is not built into standard Caddy.** The post used `rate_limit` in a Caddyfile example but did not mention that this directive is provided by the third-party module `github.com/mholt/caddy-ratelimit`. The official `caddy:2-alpine` image does **not** include it, and the Caddyfile would fail to load with an "unknown directive: rate_limit" error. Added a clarifying paragraph and a `Dockerfile` snippet showing how to build a custom image with `xcaddy` so the example actually works.

## Review Notes
- The `redir` directive without a status keyword defaults to `302` (temporary). The post does not assert a specific status for its bare-domain → www redirect, so no change is needed there. Authors who want a permanent redirect should add the `permanent` keyword (`redir https://www.yourdomain.com{uri} permanent`) for a 301.
- `version: "3.8"` at the top of the compose file is now considered obsolete by the Compose Spec (the field is ignored by recent Docker Compose versions) but it is still accepted and not technically wrong.
- The default Caddyfile path `/etc/caddy/Caddyfile` and persistent volumes `/data` (certificates) and `/config` (autosaved JSON config) are confirmed correct for the official `caddy:2-alpine` image.
- `caddy reload --config /etc/caddy/Caddyfile` correctly auto-detects the Caddyfile adapter because the filename starts with `Caddyfile` — no `--adapter caddyfile` flag required.
- Bind-mounting `./Caddyfile` from the stack directory works in Portainer when the stack is deployed via the Portainer UI's "Web editor" with a relative path; users deploying via Git or upload may need to adjust the path or use a Docker config/secret instead.
