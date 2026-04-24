# Validation Summary: How to Configure Traefik HTTP to HTTPS Redirect for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Traefik Proxy
- Portainer
- Docker Compose
- Traefik Docker labels
- HTTP to HTTPS redirection
- HSTS
- `curl`

## Sources Consulted
- Traefik entryPoints reference: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik `RedirectScheme` middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/redirectscheme/
- Traefik HTTP router reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik Docker service-by-label behavior: https://doc.traefik.io/traefik/routing/providers/service-by-label/
- Traefik headers middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Portainer reverse proxy with Traefik guide: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer install docs noting default `9443` and legacy `9000`: https://docs.portainer.io/getting-started/install/server/docker/wsl
- RFC 6797 (HTTP Strict Transport Security): https://www.rfc-editor.org/rfc/rfc6797.html
- Local `curl --help all` output for `-I` / `-L`

## Issues Found
- The file-provider redirect example was incomplete for a standalone dynamic configuration. Traefik's router reference requires a router service, so I made the example self-contained by defining both the HTTPS router and the `portainer` service backend.
- The health-check exception example conflicted with the earlier global entrypoint redirect guidance. Traefik's entrypoint redirection applies to all incoming requests on that entrypoint, so `/health` would be redirected before router matching. I corrected the explanation and changed the example to a router-level redirect pattern that allows `/health` on HTTP while redirecting other HTTP requests for the same host to HTTPS.
- The HSTS section incorrectly implied browsers would enforce HSTS before the first redirect. RFC 6797 says browsers only learn and honor HSTS from secure transport responses unless the domain is preloaded. I corrected the explanation and removed `forceSTSHeader`, which was unnecessary on the HTTPS-only router shown in the example.

## Review Notes
- The redirect examples are consistent with current Traefik reference docs and current Portainer reverse-proxy docs.
- Portainer still documents `9000` as the backend port in its Traefik reverse-proxy example, even though direct Portainer deployments expose the UI on `9443` by default and treat `9000` as legacy when published directly.
