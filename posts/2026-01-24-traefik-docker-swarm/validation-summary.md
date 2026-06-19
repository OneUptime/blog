# Validation Summary: How to Configure Traefik for Docker Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy v3
- Docker Swarm
- Docker stack deploy / Compose stack files
- Docker overlay networking
- Let's Encrypt ACME
- Traefik labels, routers, services, and middleware

## Sources Consulted
- Traefik Docker Swarm provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/
- Traefik Docker Swarm routing labels documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/swarm/
- Traefik v2 to v3 migration details for Docker Swarm provider changes: https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik BasicAuth middleware documentation: https://doc.traefik.io/traefik/middlewares/http/basicauth/
- Docker stack deploy CLI reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker swarm init CLI reference: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker swarm join CLI reference: https://docs.docker.com/reference/cli/docker/swarm/join/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Traefik v3.0 examples used the removed Docker provider Swarm mode flags (`--providers.docker=true` and `--providers.docker.swarmMode=true`). Updated them to the Traefik v3 Swarm provider flags (`--providers.swarm=true`, `--providers.swarm.endpoint=unix:///var/run/docker.sock`, `--providers.swarm.exposedbydefault=false`, and `--providers.swarm.network=traefik-public`).
- The initial Traefik service ran in global mode while using Traefik OSS built-in ACME. Updated it to one replica, because Traefik OSS v2/v3 cannot safely run multiple ACME-enabled instances without external certificate handling.
- The dashboard BasicAuth label used an invalid placeholder hash. Replaced it with a syntactically valid htpasswd-style hash with escaped dollar signs for Compose labels.
- The high-availability section recommended distributed ACME storage with Consul/NFS-style shared `acme.json`. Updated the text and comments to state that `acme.json` should not be shared across multiple Traefik OSS replicas, and that HA certificate handling should use external certificate management or Traefik Enterprise distributed Let's Encrypt.
- The production checklist repeated the distributed certificate storage guidance. Updated it to match Traefik OSS ACME limitations.

## Review Notes
- The examples keep `version: "3.8"` because they are stack files for `docker stack deploy`, and Docker's stack deploy reference still documents Compose file version 3.0 and above. Docker Compose V2 treats the top-level `version` key as obsolete and may warn when using these files with `docker compose`.
