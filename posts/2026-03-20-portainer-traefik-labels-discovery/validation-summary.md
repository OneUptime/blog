# Validation Summary: How to Use Traefik Labels for Portainer Service Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Traefik Proxy
- Docker
- Docker Compose
- Docker Swarm
- Portainer
- HTTP routing and TLS configuration

## Sources Consulted
- Traefik Docker provider docs: https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- Traefik Docker label routing reference: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik Swarm provider docs: https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/
- Traefik HTTP rules and priority reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik TLS certificates reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/tls-certificates/
- Traefik TLS options reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/tls-options/
- Traefik API and dashboard reference: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The introduction treated all Traefik label discovery as container-label based. I corrected it to distinguish standalone Docker container labels from Swarm service labels, which is how current Traefik documents the two providers.
- The prerequisites implied Portainer had to share Traefik's routing network. I corrected this to require the shared network between Traefik and the services being exposed, which is the actual networking requirement for routing.
- Step 1 said every service needed the backend port label. I corrected this to reflect current behavior: Traefik can infer the first exposed port in standalone Docker, while explicit port definition is mandatory in Swarm and advisable when multiple ports are exposed.
- The routing example used `Headers(...)`, which is not a valid current HTTP rule matcher. I replaced it with the correct `Header(...)` matcher from Traefik's routing rules reference.
- The wildcard host example used the older v2-style `HostRegexp` syntax. I replaced it with current v3 regex syntax to avoid relying on deprecated rule syntax.
- The TLS section described `traefik.http.routers.<router>.tls.options` as if it configured a static certificate. I corrected the explanation to show that it references TLS options, and added a note that user-defined certificates must be configured via the file provider's `tls.certificates`.
- The multi-network section used the Docker network label without scoping it to standalone Docker. I clarified that `traefik.docker.network` is for standalone Docker and that Swarm uses `traefik.swarm.network`.
- The verification step assumed the Traefik API/dashboard was locally available on `localhost:8080`. I corrected the wording to make clear that this check only applies when the API/dashboard is enabled and exposed.

## Review Notes
Reviewed against current Traefik Proxy reference documentation as of 2026-04-24. No remaining technical issues were found after the corrections above.
