# Validation Summary: How to Deploy Vaultwarden (Bitwarden) via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vaultwarden
- Bitwarden clients
- Portainer
- Docker Compose
- Nginx
- HTTPS / TLS
- OneUptime

## Sources Consulted
- Vaultwarden README: https://github.com/dani-garcia/vaultwarden
- Vaultwarden configuration template (`.env.template`): https://github.com/dani-garcia/vaultwarden/blob/main/.env.template
- Vaultwarden wiki, Enabling HTTPS: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-HTTPS
- Vaultwarden wiki, Proxy examples: https://github.com/dani-garcia/vaultwarden/wiki/Proxy-examples
- Vaultwarden wiki, Enabling admin page: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-admin-page
- Vaultwarden wiki, Disable registration of new users: https://github.com/dani-garcia/vaultwarden/wiki/Disable-registration-of-new-users
- Vaultwarden source, `/alive` route: https://github.com/dani-garcia/vaultwarden/blob/main/src/api/web.rs
- Vaultwarden Docker healthcheck script: https://github.com/dani-garcia/vaultwarden/blob/main/docker/healthcheck.sh
- Docker Docs, Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- NGINX Docs, WebSocket proxying: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post said Vaultwarden was "fully compatible with all official Bitwarden clients". Upstream documents it as compatible with official clients, but does not make a blanket "fully compatible" claim, so I softened that wording.
- The prerequisite list included a hard `128MB RAM` minimum. I could not verify a current upstream-documented minimum requirement, so I removed the unsourced numeric claim.
- The Compose example used the obsolete top-level `version: "3.8"` key. Current Docker Compose documentation marks `version` as obsolete, so I removed it.
- The Compose example published Vaultwarden on all interfaces with `8188:80`. For a reverse-proxied deployment on the same host, upstream examples bind the published port to loopback, so I changed it to `127.0.0.1:8188:80`.
- The Compose example used `WEBSOCKET_ENABLED`, which is outdated. Current Vaultwarden configuration uses `ENABLE_WEBSOCKET`, so I updated the variable name.
- The Nginx example was outdated. It proxied `/notifications/hub` to `127.0.0.1:3012` and omitted the standard `Upgrade`, `Connection`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers on the main proxy path. I replaced it with the current upstream-style reverse proxy pattern that sends all requests to the main Vaultwarden HTTP port and forwards the required headers for WebSocket support.
- The deploy step used `openssl rand -hex 32`. That command works, but Vaultwarden's current admin-page documentation uses `openssl rand -base64 32`, so I aligned the example with upstream guidance.
- The monitoring section said `/alive` returns an empty `200 OK`. Current Vaultwarden source returns `200 OK` with a timestamp body, and the bundled Docker healthcheck also uses `/alive`, so I corrected that description.

## Review Notes
- Vaultwarden currently prefers an Argon2 PHC string for `ADMIN_TOKEN` in its configuration template, but a long random token is still supported. The post keeps the simpler random-token approach for a Portainer walkthrough.
- The post still uses `vaultwarden/server:latest`. That is valid, but pinning a release tag would make the instructions more reproducible over time.
