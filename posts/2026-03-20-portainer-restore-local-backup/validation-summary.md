# Validation Summary: How to Restore Portainer from a Local Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE / Portainer backup and restore
- Docker volumes and `docker run`
- Portainer HTTP API
- Shell commands with `tar`, `curl`, `scp`, and `jq`

## Sources Consulted
- Portainer docs, General settings and backup/restore: https://docs.portainer.io/admin/settings/general
- Portainer docs, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer docs, API usage examples: https://docs.portainer.io/api/examples
- Portainer docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer docs, Roll back to a previous version of Portainer: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer docs, What does Portainer's backup include?: https://docs.portainer.io/2.33-lts/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Docker docs, Volumes and backup/restore examples: https://docs.docker.com/engine/storage/volumes/
- Docker docs, `docker container stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker docs, `docker container rm`: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker docs, `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker docs, `docker volume rm`: https://docs.docker.com/reference/cli/docker/volume/rm/
- Docker docs, `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Portainer source, Linux Dockerfile entrypoint: https://github.com/portainer/portainer/blob/develop/build/linux/Dockerfile
- Portainer source, auth handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source, users list handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_list.go
- Portainer source, endpoints list handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_list.go
- Portainer source, stack status enum: https://github.com/portainer/portainer/blob/develop/api/portainer.go

## Issues Found
- The prerequisites said the backup could be `.tar.bz2`, but the documented Portainer local backup format is `tar.gz` and the restore examples used `tar xzf`. I corrected the prerequisite to `tar.gz`.
- The UI restore section implied any existing installation could use the built-in restore flow and described it as an API or BE-only feature. Portainer’s official docs say restoring from a local file is done on a fresh instance during initial setup, and local disk backup/restore is not BE-only. I corrected the scope and wording.
- The UI restore section used `http://your-host:9000` as the primary access URL. Current Portainer docs use `9443` as the default UI/API port, with `9000` described as legacy HTTP. I updated the restore UI step to `https://your-host:9443`.
- The migration section used `docker exec portainer /app/portainer --version` and a hard-coded `portainer/portainer-ce:2.21.0` example. The current Portainer image entrypoint is `/portainer`, and hard-coding an old version is unnecessarily outdated. I changed the example to reuse the exact source image tag via `docker inspect --format '{{.Config.Image}}' portainer`.
- The reconnect section stated that agents need to reconnect after restore, which is not generally true for all environment types. Standard Portainer Agent environments are reached by the server using the saved environment URL. I changed the wording to focus on saved connection details and made the restart command a generic placeholder.
- The stack status section only documented values `1` and `2`. Portainer’s source defines additional stack states including `3` for deploying and `4` for error. I expanded the status comment.
- The manual restore command used unquoted `dirname` and `basename` substitutions. I quoted them to avoid shell breakage with paths containing spaces.
- The conclusion repeated the inaccurate built-in restore wording. I corrected it to match Portainer’s documented local-file restore workflow.

## Review Notes
- Portainer backups restore Portainer configuration and stack metadata, not the containers, volumes, or application data running in managed environments.
- The post’s API verification examples still use port `9000`, which remains valid when legacy HTTP is explicitly published as shown in the Docker run examples, but `9443` is the current default port in Portainer documentation.
