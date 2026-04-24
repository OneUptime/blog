# Validation Summary: How to Deploy Caddy via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Docker networking
- Caddy
- Caddyfile
- caddy-docker-proxy
- Let's Encrypt / ACME

## Sources Consulted
- Caddy `redir` directive documentation: https://caddyserver.com/docs/caddyfile/directives/redir
- Caddy `basic_auth` directive documentation: https://caddyserver.com/docs/caddyfile/directives/basic_auth
- Caddyfile concepts and site address syntax: https://caddyserver.com/docs/caddyfile/concepts
- Caddy automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy command line documentation: https://caddyserver.com/docs/command-line
- Caddy directives reference: https://caddyserver.com/docs/caddyfile/directives
- Caddy module documentation for `rate_limit` (non-standard module): https://caddyserver.com/docs/modules/http.handlers.rate_limit/http.matchers.conneg
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- `caddy-docker-proxy` project documentation: https://github.com/lucaslorentz/caddy-docker-proxy

## Issues Found
1. **Relative bind mounts were misleading for a Portainer stack.** The original stack used `./Caddyfile` and `./site`, but Portainer documents relative path volumes as a Git deployment feature in Business Edition. Replaced those with absolute host paths (`/opt/caddy/...`) and updated the accompanying instruction so the example works in a normal Portainer stack deployment.
2. **The reverse proxy example omitted the required shared Docker network.** The Caddyfile proxies to service names like `myapp` and `api-service`, which only resolve when the containers share a user-defined Docker network. Added an external `caddy-network` to the main stack example and clarified that proxied containers must join that network.
3. **The apex redirect example used invalid Caddyfile syntax and was placed in the wrong site block.** `redir example.com{uri} https://www.example.com{uri}` inside the `www.example.com` block would not redirect requests for `example.com`. Replaced it with a separate `example.com` site block using `redir https://www.example.com{uri} permanent`, which matches Caddy's documented syntax.
4. **`rate_limit` was shown in the stock `caddy:2-alpine` configuration even though it is not included in standard Caddy builds.** The Caddy module docs mark it as a non-standard module. Commented out the directive and added a note that a custom Caddy build is required before enabling it.
5. **The post used the deprecated `basicauth` directive name.** Caddy renamed this directive to `basic_auth` in v2.8.0. Updated the example to the current directive name.
6. **The formatting command would fail against the post's read-only Caddyfile mount.** `caddy fmt --overwrite /etc/caddy/Caddyfile` tries to rewrite a file mounted as `:ro`. Changed the command to `docker exec caddy caddy fmt /etc/caddy/Caddyfile`, which prints the formatted file instead of attempting an in-container overwrite.

## Review Notes
- The remaining Caddy examples are consistent with current Caddy documentation, including `reverse_proxy` health checks, automatic HTTPS behavior, `tls internal` for local development, and the `http://` catch-all redirect site.
- The `lucaslorentz/caddy-docker-proxy:ci-alpine` image reference is valid, but it tracks CI builds rather than a pinned release. For a long-lived production guide, pinning a released image tag would improve reproducibility.
- Runtime validation with `docker`/`caddy` binaries was not possible in this workspace because `docker` is not installed, so validation was performed against upstream documentation and authoritative project docs.
