# Validation Summary: How to Set Up a Microservices Gateway with Portainer and Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy
- Docker Compose
- Docker networking
- Portainer
- Let's Encrypt ACME HTTP challenge
- Reverse proxy and API gateway routing

## Sources Consulted
- Traefik release support policy: https://doc.traefik.io/traefik/deprecation/releases/
- Traefik Docker provider configuration: https://doc.traefik.io/traefik/v3.0/providers/docker/
- Traefik Docker routing labels and network selection: https://doc.traefik.io/traefik/v3.3/routing/providers/docker/
- Traefik HTTPS/TLS router configuration: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/
- Traefik Docker Compose ACME HTTP challenge guide: https://doc.traefik.io/traefik/v3.4/user-guides/docker-compose/acme-http/
- Traefik API and dashboard configuration: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Docker Compose specification (`version` top-level element): https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer behind Traefik reference: https://docs.portainer.io/advanced/reverse-proxy/traefik

## Issues Found
1. **Unsupported Traefik image tag.** The post pinned `traefik:v3.0`, but Traefik's release policy shows 3.0 support ended on July 15, 2024. Updated the example to `traefik:v3.6`, which is the actively supported 3.x minor as of April 29, 2026.
2. **Incorrect Docker network name in Traefik provider config.** The post set `--providers.docker.network=gateway_net`, but the Compose network is explicitly named `gateway_network`. Traefik's Docker provider expects the actual Docker network name, not the Compose alias, so this would point Traefik at the wrong network. Updated the flag to `gateway_network`.
3. **Obsolete Compose `version` field.** The post used `version: "3.8"`. Current Docker Compose documentation marks the top-level `version` field as obsolete and informational only. Removed it to match current Compose syntax.
4. **Dashboard router was not configured as an HTTPS router.** The post described TLS termination, but the dashboard router did not declare an HTTPS entrypoint or certificate resolver. Added `traefik.http.routers.dashboard.entrypoints=websecure` and `traefik.http.routers.dashboard.tls.certresolver=le` so the dashboard example matches the TLS-enabled setup.
5. **The "Adding New Services" example was incomplete for the documented TLS setup.** The original snippet only used `PathPrefix(`/new`)`, which does not provide the host information Traefik uses in the ACME example to issue certificates, and it omitted the HTTPS entrypoint and cert resolver labels. Updated the example to include the `Host(`api.example.com`)` rule, `websecure` entrypoint, and `tls.certresolver=le`.

## Review Notes
- The Portainer node in the architecture diagram remains labeled `:9000`. This is technically defensible for a Traefik-to-Portainer upstream path because Portainer's own Traefik reverse-proxy example uses `traefik.http.services.frontend.loadbalancer.server.port=9000`.
- The Traefik dashboard route is technically functional after the TLS fix, but the official Traefik dashboard documentation recommends constraining the rule to `/api` and `/dashboard` paths and protecting it with authentication. That is a future hardening improvement rather than a correctness blocker for this post.
- A local `docker compose` parser check could not be run in this workspace because the `docker` CLI is not installed here.
