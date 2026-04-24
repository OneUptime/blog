# Validation Summary: How to Run Portainer Under a Subpath (Base URL)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Nginx
- Traefik
- Caddy
- Docker Compose
- WebSockets
- Reverse proxies

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced/cli
- Portainer reverse proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Portainer Traefik reverse proxy guide: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer release notes: https://docs.portainer.io/sts/release-notes
- Nginx `proxy_pass` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Traefik routers and rule matching: https://doc.traefik.io/traefik/v3.3/routing/routers/
- Traefik `StripPrefix` middleware: https://doc.traefik.io/traefik/v3.3/middlewares/http/stripprefix/
- Traefik `ServersTransport`: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/serverstransport/
- Caddy `reverse_proxy` directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy `handle_path` directive: https://caddyserver.com/docs/caddyfile/directives/handle_path

## Issues Found
- The overview implied Portainer subpath hosting was mainly a reverse-proxy workaround. I corrected this to reflect current Portainer behavior: current versions support subpath hosting with `--base-url`, and the proxy must strip that prefix before forwarding.
- The post did not mention the required Portainer startup flag for subpath deployments. I added `--base-url /portainer` to the prerequisites so the guidance matches Portainer's documented configuration.
- The Traefik example forwarded to Portainer on `9443` over HTTPS without the extra Traefik `ServersTransport` configuration needed for self-signed upstream TLS, which is Portainer's default behavior. I changed the example to run Portainer with `--http-enabled` and route Traefik to port `9000`, which is a working configuration pattern.
- The Traefik router rule used `PathPrefix(`/portainer`)`, which also matches unrelated paths such as `/portainer-extra`. I tightened the rule to `Path(`/portainer`) || PathPrefix(`/portainer/`)` so it matches the intended subpath only.
- The WebSocket testing example used an incomplete `wscat` command against a Portainer WebSocket endpoint without the required session parameters. I replaced it with a practical validation step: confirm console or log streaming in the Portainer UI stays connected.
- The redirect-loop troubleshooting note incorrectly suggested `--http-disabled` as a fix. I removed that claim and left the troubleshooting guidance focused on the actual proxy headers and upstream scheme.
- The CSS/JS troubleshooting note treated the trailing slash in Nginx `proxy_pass` as the only critical factor. I updated it to also call out the required `--base-url /portainer` setting.

## Review Notes
- If Portainer is behind a reverse proxy and returns `Origin invalid`, Portainer's `--trusted-origins` option may also be needed, per the Portainer CLI documentation.
- The Nginx and Caddy examples disable upstream TLS verification when proxying to Portainer's local `9443` listener. That is functional for local self-signed certificates, but trusting a specific upstream certificate is preferable in production.
