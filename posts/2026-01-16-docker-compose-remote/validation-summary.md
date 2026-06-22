# Validation Summary: How to Deploy Docker Compose Stacks to Remote Hosts

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker contexts
- Docker Compose
- SSH-based Docker daemon access
- Docker Swarm stack deployment
- GitHub Actions
- GitLab CI
- Traefik
- Let's Encrypt ACME HTTP-01 challenge
- Bash and Makefile deployment automation

## Sources Consulted
- Docker contexts documentation: https://docs.docker.com/engine/manage-resources/contexts/
- Docker CLI help for `docker context create`
- Docker Compose CLI help for `docker compose up`
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker CLI help for `docker stack deploy`
- Traefik Docker provider basic example: https://doc.traefik.io/traefik/expose/docker/basic/
- Traefik Let's Encrypt / ACME documentation: https://doc.traefik.io/traefik/v2.11/https/acme/
- Traefik Docker Compose HTTP challenge example: https://doc.traefik.io/traefik/v3.4/user-guides/docker-compose/acme-http/

## Issues Found
- The Compose examples used the obsolete top-level `version: '3.8'` field. Removed it because Compose V2 treats it as informational only and emits an obsolete-field warning.
- The first Compose example used `deploy.replicas: 2` together with a fixed host port mapping of `80:80`. This is misleading for a plain `docker compose up` deployment and can conflict when multiple replicas publish the same host port. Replaced the `deploy` block with `restart: on-failure`.
- The basic deployment script described `docker compose up -d --remove-orphans` as "zero downtime." Plain Compose recreate/update behavior does not guarantee zero downtime. Changed the comment to "Deploy in detached mode."
- The GitHub Actions example wrote the SSH private key to `~/.ssh/deploy_key` but did not configure SSH to use that non-default identity. Added an SSH config block with `IdentityFile ~/.ssh/deploy_key`.
- The Traefik ACME example enabled HTTP challenge but omitted the required challenge entrypoint and certificate storage path. Added `httpchallenge.entrypoint=web` and `acme.storage=/letsencrypt/acme.json`.
- The Traefik router used TLS certificate resolver labels but did not bind the router to the HTTPS entrypoint. Added `traefik.http.routers.web.entrypoints=websecure`.

## Review Notes
- `docker stack deploy` is correctly shown for Swarm, but Docker documents that it uses the legacy Compose file version 3 format rather than the full latest Compose Specification.
- The GitLab CI example uses Docker-in-Docker even though the deployment targets a remote Docker context over SSH; this is not strictly required for the shown commands but is not technically invalid.
- The deployment scripts prune images and volumes on the selected remote context. This is valid, but production users should review pruning behavior before adopting the scripts.
