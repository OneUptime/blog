# Validation Summary: How to Set the Working Directory and User for a Container in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Dockerfile
- Node.js Docker Official Image
- NGINX unprivileged container image
- Alpine Linux

## Sources Consulted
- Portainer advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker run reference: https://docs.docker.com/engine/containers/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile
- Docker exec reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Node.js Docker Official Image repository: https://github.com/nodejs/docker-node
- NGINX unprivileged image repository: https://github.com/nginx/docker-nginx-unprivileged
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Node.js release schedule: https://nodejs.org/en/about/releases/

## Issues Found
- The post said containers run as root by default without qualification. I changed this to the Docker-accurate behavior: the image default user applies first, and Docker falls back to `root` only if no user is set.
- The security explanation said a container escape grants root on the host. I softened this to the accurate claim that running as root increases the impact of an escape.
- The Portainer UI instructions referred to `Working dir` and a `Command & logging` tab. I updated this to Portainer's documented `Advanced` section and `Working Dir` field.
- The runtime mapping explanation implied Portainer's working-directory setting was equivalent to both `docker run -w` and Dockerfile `WORKDIR`. I corrected this to say it matches `-w` and overrides the image's `WORKDIR`.
- The user-resolution note incorrectly said the user must exist inside the image in all cases. I corrected it so named users/groups must exist, while numeric `UID:GID` values do not require passwd/group entries.
- The Node.js example claimed a bind-mounted directory would be owned by the `node` user. I replaced that comment with an accurate description of the read-only mount.
- The NGINX example had duplicate `image:` keys, which made the YAML invalid for practical use. I removed the duplicate and kept the unprivileged image.
- The Python example used `python:3.12-slim` with `uvicorn` even though `uvicorn` is not included in that image by default. I replaced it with `python -m http.server 8000`, which works on the stock image.
- The Dockerfile example used `alpine:3.18`, which is outdated as of April 24, 2026. I updated it to `alpine:3.23`, a current supported release line.
- The host-permissions example suggested `chgrp docker`, which is not generally meaningful for container group access because runtime access is based on numeric GIDs. I changed it to use the container's numeric GID and `g+rwX`.
- The verification snippet labeled the `id` output as if it were universal. I changed that line to `Example output` to keep it accurate.

## Review Notes
- The `node:20-alpine` example is still technically valid as of April 24, 2026, but Node 20 is in Maintenance LTS rather than Active LTS.
