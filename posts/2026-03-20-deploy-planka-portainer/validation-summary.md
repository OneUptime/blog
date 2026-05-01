# Validation Summary: How to Deploy Planka (Trello Alternative) via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer stacks
- Docker Compose
- Planka
- PostgreSQL
- OpenSSL
- Docker CLI (`docker exec`, `docker run`)

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add?fallback=true
- PLANKA Docs: Production Version — https://docs.planka.cloud/docs/installation/docker/production-version/
- PLANKA Docs: Admin User — https://docs.planka.cloud/docs/configuration/admin-user/
- PLANKA Docs: Backup & Restore — https://docs.planka.cloud/docs/installation/docker/backup-and-restore/
- PLANKA official compose file for `v1.26.3` — https://raw.githubusercontent.com/plankanban/planka/v1.26.3/docker-compose.yml
- PLANKA Releases — https://github.com/plankanban/planka/releases
- PLANKA GitHub package page — https://github.com/orgs/plankanban/packages/container/package/planka
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker container run` — https://docs.docker.com/reference/cli/docker/container/run/
- PLANKA source: `server/config/custom.js` — https://github.com/plankanban/planka/blob/master/server/config/custom.js
- PLANKA source: `server/config/session.js` — https://github.com/plankanban/planka/blob/master/server/config/session.js
- PLANKA source: `server/api/helpers/users/present-one.js` — https://github.com/plankanban/planka/blob/master/server/api/helpers/users/present-one.js
- PLANKA source: `server/api/helpers/notifications/create-one.js` — https://github.com/plankanban/planka/blob/master/server/api/helpers/notifications/create-one.js

## Issues Found
- The post described Planka as "open-source", but the current official project materials describe it as fair-code / source-available. I removed the open-source claim to match the current project status.
- The compose example pinned `ghcr.io/plankanban/planka:1.23.1`. Current official release notes include a security fix and advise updating to `>= 1.26.3` or `>= 2.0.0-rc.4`, so I updated the guide to Planka's current official `latest` image track.
- The compose snippet included the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The post built `BASE_URL` from `PLANKA_DOMAIN` but then told readers to open `http://<host>:1337`. I changed the example to set `BASE_URL` directly and updated the access step so the configured URL and the login instructions are consistent.
- The `SECRET_KEY` example said "64-char-secret", but `openssl rand -hex 64` outputs 64 random bytes encoded as 128 hex characters. I corrected the variable example accordingly.
- The backup section only archived attachments and assumed an unprefixed Docker volume name. I expanded it to include user avatars and project background images, and changed the file backup commands to use `--volumes-from planka` so they work with the container's mounted volumes in a Portainer-managed stack.
- The database backup command now specifies `-d planka` explicitly for clarity.

## Review Notes
- Leaving `DEFAULT_ADMIN_*` variables in the compose file after the first successful startup is supported, but PLANKA's admin-user docs note that if `DEFAULT_ADMIN_EMAIL` remains set, that admin user cannot be deleted or edited by others.
- The post now matches PLANKA's current stable Docker deployment pattern as documented for the `latest` image track at validation time. If PLANKA repoints `latest` to a different major release later, this post should be revalidated.
- The conclusion's notes about `SECRET_KEY` invalidating sessions and `BASE_URL` needing to match the public URL are consistent with PLANKA's configuration and source code.
