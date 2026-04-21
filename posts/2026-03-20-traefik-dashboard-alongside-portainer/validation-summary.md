# Validation Summary: How to Run the Traefik Dashboard Alongside Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy
- Traefik Dashboard and API
- Traefik Docker provider labels
- Traefik BasicAuth middleware
- Traefik ACME / Let's Encrypt HTTP-01 challenge
- Portainer CE
- Docker Compose
- Apache htpasswd

## Sources Consulted
- Traefik API & Dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik HTTP router documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik TLS certificates documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/tls-certificates/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik BasicAuth middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/basicauth/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- Traefik Docker routing labels documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik release support documentation: https://doc.traefik.io/traefik/deprecation/releases/
- Portainer CE Docker installation documentation: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Traefik reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Apache htpasswd documentation: https://httpd.apache.org/docs/current/en/programs/htpasswd.html

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.
- The Compose example used `traefik:v3.0`, which is no longer under active or security support. Updated it to the supported Traefik v3.6 line.
- The Traefik dashboard was enabled with `--api.dashboard=true`; current Traefik documentation shows `--api=true` as the dashboard/API enablement flag and notes that it enables the dashboard sub-option. Updated the flag.
- The dashboard router did not specify the `websecure` entrypoint or a TLS router configuration, and the Portainer router also omitted TLS, while the post instructs readers to use `https://` URLs. Added `entrypoints=websecure` and `tls=true` where needed.
- The dashboard route used a broad host-only rule. This can work, but Traefik's dashboard documentation recommends matching both `/api` and `/dashboard` paths for dashboard access. Updated the rule to include both path prefixes.
- The BasicAuth label used an abbreviated placeholder hash that would not authenticate as a real htpasswd hash. Replaced it with a valid APR1-formatted example and changed the generation command to `htpasswd -nbm` so the documented output format matches the example.
- The Portainer image used the mutable `latest` tag. Updated it to `portainer/portainer-ce:lts`, matching Portainer's current CE installation guidance.
- The Let's Encrypt section said to add the certificate resolver label to each router but only showed the Portainer router label. Added the Traefik dashboard resolver label as well.

## Review Notes
The Portainer backend port `9000` is consistent with Portainer's Traefik reverse proxy documentation, even though current Portainer standalone installation docs expose the public UI on `9443` by default. Docker is not installed in the local environment, so the Compose example was reviewed against official documentation rather than executed with `docker compose config`.
