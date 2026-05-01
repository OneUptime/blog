# Validation Summary: How to Deploy Restic with REST Server via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Restic
- rest-server
- Portainer
- Docker Compose
- Docker volumes
- HTTP Basic Authentication with `htpasswd`

## Sources Consulted
- restic documentation: Preparing a new repository — https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- restic documentation: Restoring from backup — https://restic.readthedocs.io/en/stable/050_restore.html
- restic documentation: Removing backup snapshots — https://restic.readthedocs.io/en/stable/060_forget.html
- restic documentation: REST Backend — https://restic.readthedocs.io/en/latest/REST_backend.html
- rest-server README — https://github.com/restic/rest-server
- rest-server Dockerfile — https://github.com/restic/rest-server/blob/master/Dockerfile
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Add a new stack — https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- The Compose file mounted `./htpasswd` into `/etc/rest-server/.htpasswd`, but the instructions created `/opt/restic/htpasswd`. I changed the mount to `/opt/restic/htpasswd:/data/.htpasswd:ro` to match the file created in Step 2 and the `rest-server` image's documented default auth file location.
- The post used `RESTIC_PASSWORD` for the REST server's HTTP password and `RESTIC_REPO_PASSWORD` for the repository encryption password. In `restic`, `RESTIC_PASSWORD` is the repository password. I corrected the environment variable usage to `REST_SERVER_PASSWORD` for HTTP auth and `RESTIC_PASSWORD` for the repository encryption password.
- The repository URL was `...@rest-server:8000/backups` while `rest-server --private-repos` requires the repository path to begin with the authenticated username. I changed it to `...@rest-server:8000/restic/backups`.
- The `healthcheck` queried `http://localhost:8000/` without authentication. With authentication enabled, that probe would fail. I removed the incorrect healthcheck instead of leaving a broken example.
- The client entrypoint did not retry if `rest-server` was not ready yet, and its retention policy omitted the monthly snapshot rule shown later in the post. I changed the startup command to retry until `snapshots` or `init` succeeds and aligned the automated retention policy with `--keep-monthly 6`.
- The manual initialization step used `restic init` unconditionally, which can fail once the repository already exists. I changed it to initialize only when the repository has not been created yet.
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The conclusion did not mention that the example uses HTTP Basic Auth over plain HTTP. I added a short correction noting that TLS or a trusted network is required before exposing the service.

## Review Notes
- The post pins `restic/restic:0.16.4` and `restic/rest-server:0.13.0`. The configuration remains valid, but those are older releases than the current `restic` documentation covers, so readers may want to review newer release notes before deploying in production.
- The restore examples write into `/tmp/restore` inside the `restic_client` container. That is technically valid, but a host bind mount may be more practical for real restore workflows.
