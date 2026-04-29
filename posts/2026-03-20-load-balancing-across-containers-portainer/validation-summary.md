# Validation Summary: How to Set Up Load Balancing Across Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose / stack files
- Traefik
- Nginx
- Let's Encrypt ACME

## Sources Consulted
- Docker Docs: Use Swarm mode routing mesh - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Traefik v3.0 Docker Swarm provider docs - https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik v3 migration docs - https://doc.traefik.io/traefik/master/migrate/v2-to-v3-details/
- Traefik API & Dashboard docs - https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik ACME docs - https://doc.traefik.io/traefik/v3.2/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik Swarm routing labels docs - https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/swarm/
- NGINX docs: Using nginx as HTTP load balancer - https://nginx.org/en/docs/http/load_balancing.html
- Portainer docs: Add a Docker Swarm environment - https://docs.portainer.io/sts/admin/environments/add/swarm

## Issues Found
- The Traefik example used `--providers.docker.swarmMode=true`, which is not the correct Traefik v3 approach. In Traefik v3, Swarm uses the dedicated Swarm provider, so I changed the example to `--providers.swarm.endpoint=unix:///var/run/docker.sock`.
- The Traefik ACME example enabled HTTP challenge but omitted the required `acme.storage` location and the HTTP challenge entrypoint. I added `--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json` and `--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web`.
- The stack published port `8080` as a Traefik dashboard port without enabling the API/dashboard. I added `--api.insecure=true` and clarified the comment to mark the dashboard exposure as development-only.

## Review Notes
- Methods 1 and 2 are Swarm-specific and therefore require Portainer to be managing a Docker Swarm environment with Swarm mode enabled.
- The post's `version: "3.8"` stack syntax is still appropriate for Swarm stack deployment because `docker stack deploy` continues to use the legacy Compose v3 format.
- The pinned image tags (`traefik:v3.0`, `nginx:1.25`) are older than current releases but remain technically valid as example versions; they are not using deprecated configuration syntax after the fixes above.
