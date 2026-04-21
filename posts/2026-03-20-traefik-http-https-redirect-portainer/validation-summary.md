# Validation Summary: How to Configure Traefik HTTP to HTTPS Redirect for Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy
- Portainer CE
- Docker Compose
- Let's Encrypt ACME HTTP-01 challenge
- HTTPS redirects
- HSTS headers
- curl

## Sources Consulted
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik RedirectScheme middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/redirectscheme/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- Traefik Docker routing labels documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik release support documentation: https://doc.traefik.io/traefik/deprecation/releases/
- Portainer Docker install documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Traefik reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Docker Compose volumes documentation: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose services volumes documentation: https://docs.docker.com/reference/compose-file/services/
- Local `curl --help all` output for `--head`, `--location`, and `--max-redirs`

## Issues Found
- The per-router Portainer labels omitted `traefik.enable=true`. This matters when used with the post's Traefik configuration, which sets `providers.docker.exposedbydefault=false`; containers without the enable label are ignored by the Docker provider. Added the label.
- The redirect-loop test used `curl -I --max-redirs 5`, but curl only follows redirects when `-L` / `--location` is set. Changed it to `curl -IL --max-redirs 5`.
- The full Compose snippet used the unsupported Traefik `v3.0` minor. Traefik's support table shows v3.0 no longer has active or security support as of the validation date, while v3.6 is the supported v3 minor. Updated the image tag to `traefik:v3.6`.
- The Compose snippet referenced the named volume `traefik_data` without a top-level volume declaration. Added `volumes: traefik_data:` so the snippet is a complete Compose file.

## Review Notes
The Traefik entrypoint redirect, RedirectScheme middleware labels, HSTS header labels, ACME HTTP-01 challenge configuration, and Portainer backend port `9000` usage were consistent with official documentation. Docker was not installed in the local environment, so the Compose file was reviewed against documentation rather than executed.
