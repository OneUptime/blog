# Validation Summary: How to Deploy Vaultwarden (Bitwarden) via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Vaultwarden
- Bitwarden clients
- Portainer
- Docker Compose / Docker stacks
- Traefik
- Caddy
- SMTP
- YAML

## Sources Consulted
- Vaultwarden README: https://github.com/dani-garcia/vaultwarden
- Vaultwarden admin page wiki: https://github.com/dani-garcia/vaultwarden/wiki/Enabling-admin-page
- Vaultwarden environment template: https://github.com/dani-garcia/vaultwarden/blob/main/.env.template
- Bitwarden client connection docs: https://bitwarden.com/help/change-client-environment/
- Bitwarden web app / two-step login docs: https://bitwarden.com/help/getting-started-webvault/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker volume backup docs: https://docs.docker.com/engine/storage/volumes/
- Docker `run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Traefik Docker routing docs: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Caddy `reverse_proxy` docs: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The stack example used the top-level Compose `version` field. Docker now documents this field as obsolete, so I removed it to keep the example current.
- The Bitwarden client setup steps were outdated. The post referenced older extension and app UI flows, so I updated browser, desktop, and mobile instructions to the current `Logging in on` -> `Self-hosted` flow documented by Bitwarden.
- The 2FA navigation path was outdated. I changed it to `Settings > Security > Two-step login` to match the current Bitwarden web vault flow.
- The HTTPS wording overstated the requirement by saying a reverse proxy was essential specifically for browser extensions. I corrected this to reflect current Vaultwarden guidance: HTTPS is effectively required for proper client and web vault operation, and a reverse proxy is the recommended way to provide it.
- The backup command mounted a named volume directly. I changed it to Docker's documented `--volumes-from vaultwarden` pattern so the example backs up the container's mounted Vaultwarden data directory more reliably.

## Review Notes
- The post is technically relevant and valid after the fixes above.
- `vaultwarden/server:latest` is valid, but pinning a specific image tag would make deployments more reproducible over time.
- Vaultwarden supports a plain `ADMIN_TOKEN`, but its documentation recommends securing the admin token with an Argon2 PHC string when possible.
