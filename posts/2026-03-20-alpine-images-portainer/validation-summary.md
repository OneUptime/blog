# Validation Summary: How to Use Alpine-Based Images for Smaller Containers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Portainer stacks
- Alpine Linux-based container images
- PostgreSQL
- Redis
- Nginx
- Uptime Kuma

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer docs: How Relative Path Support works in Portainer - https://docs.portainer.io/advanced/relative-paths
- Docker docs: Base images - https://docs.docker.com/articles/baseimages/
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: Services top-level element - https://docs.docker.com/reference/compose-file/services/
- Docker docs: Control startup order in Compose - https://docs.docker.com/compose/how-tos/startup-order/
- Docker docs: Volumes top-level element - https://docs.docker.com/reference/compose-file/volumes/
- Docker docs: Networks top-level element - https://docs.docker.com/reference/compose-file/networks/
- Docker CLI reference: `docker container exec` - https://docs.docker.com/engine/reference/commandline/exec
- Docker Hub official image docs: PostgreSQL - https://hub.docker.com/_/postgres
- Docker Hub official image docs: Redis - https://hub.docker.com/_/redis
- Docker Hub official image docs: NGINX - https://hub.docker.com/_/nginx
- Uptime Kuma official Docker tags wiki - https://github.com/louislam/uptime-kuma/wiki/Docker-Tags

## Issues Found
- The compose example used the obsolete top-level `version` field. I removed it and updated the file comment to `compose.yaml` to match current Compose guidance.
- The post claimed to use Alpine-based images, but the main application image was `app-image:latest`. I changed it to `app-image:alpine` so the example matches the article's stated subject.
- `APP_URL` and `ADMIN_EMAIL` were listed as Portainer stack variables but were never referenced in the compose file, so they would not have been injected into the container. I added both variables to the `app` service environment block.
- The app healthcheck used `curl`, which is not a safe assumption for Alpine-based images, and Step 4 checked a different `/api/health` endpoint than the compose file. I switched the healthcheck to BusyBox `wget --spider` and aligned the verification command to `http://localhost:8080/health`.
- Step 4 used Django-specific `manage.py` commands even though the article otherwise described a generic application stack. I replaced those commands with a generic `docker exec -it app sh` first-run setup flow so the section is technically consistent.
- The article was written as a general Portainer stack guide, but the example relies on Docker Standalone behavior such as direct `docker exec`, `container_name`, and `depends_on` health conditions. I narrowed the prerequisite from a generic Docker environment to a Docker Standalone environment connected to Portainer.
- The NGINX reverse-proxy snippet used relative bind mounts (`./nginx.conf` and `./certs`) even though the article's flow is the Portainer web editor. Portainer's relative-path support is a special Git-deployment feature, so I replaced those mounts with explicit host paths.
- The backup script referred to compose logical volume names and a logical network name from outside Compose without ensuring those names would exist on the Docker host. I added explicit `name:` values for the stack volumes and network so the backup and troubleshooting commands target stable engine-side resource names.
- The backup script omitted `redis-data` even though the stack enables Redis AOF persistence, and the retention cleanup used an unsafe `find | xargs rm -rf` pipeline. I added `redis-data` to the backup loop and replaced the cleanup step with `find ... -exec rm -rf {} +`.
- The monitoring example used `louislam/uptime-kuma:latest`, but the project's official documentation marks `latest` as deprecated. I changed the image tag to `louislam/uptime-kuma:2` and added the missing top-level `uptime-data` volume declaration.
- The troubleshooting commands were incorrect: `pg_isready` was run inside the app container instead of the PostgreSQL container, and `curl` was used against PostgreSQL's TCP port as if it were an HTTP service. I corrected these to `docker exec app-postgres pg_isready ...` and `docker run --rm --network app-net alpine nc -zv postgres 5432`.
- The conclusion said the stack was easy to scale, but the example deliberately uses fixed `container_name` values for stable `docker exec` commands, which prevents scaling a service beyond one container in Compose. I changed that claim to "customize and maintain".

## Review Notes
- Alpine-based images are smaller, but they typically use `musl libc` instead of `glibc`. Some applications, native modules, or database extensions need compatibility testing before switching to Alpine variants.
- `app-image:alpine` remains a placeholder image reference. Readers still need to substitute a real image tag that provides the expected application process and `/health` endpoint.
- The post now accurately reflects a Docker Standalone + Portainer stack workflow. A Docker Swarm version of this article would need different operational commands and different assumptions around startup dependencies.
- Pinning exact image tags such as `postgres:15.17-alpine` or a specific `redis:7.x.y-alpine` release would make the guide more reproducible over time.
