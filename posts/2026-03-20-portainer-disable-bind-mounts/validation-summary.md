# Validation Summary: How to Disable Bind Mounts for Non-Admin Users in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer Documentation, Setup: https://docs.portainer.io/user/docker/host/setup?fallback=true
- Portainer Documentation, API documentation: https://docs.portainer.io/api/docs
- Portainer source, endpoint settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_settings_update.go
- Portainer source, authentication handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source, Docker security settings UI: https://github.com/portainer/portainer/blob/develop/app/docker/views/docker-features-configuration/docker-features-configuration.html
- Portainer source, Docker security settings controller: https://github.com/portainer/portainer/blob/develop/app/docker/views/docker-features-configuration/docker-features-configuration.controller.js
- Portainer source, endpoint type and security settings models: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source, bind-mount enforcement for container creation: https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/docker/containers.go
- Portainer source, bind-mount enforcement for volume creation: https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/docker/volumes.go
- Docker Docs, Bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs, Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Portainer UI wording in current documentation uses `Hide bind mounts for non-administrators` and the save action is labeled `Save configuration`, not the older wording used in the draft. I updated the UI instructions to match the current product wording.
- The Portainer API for `PUT /api/endpoints/{id}/settings` uses `allowBindMountsForRegularUsers: false`, not `disableBindMountsForRegularUsers: true`. I corrected both API examples to use the current request field.
- The bulk-update script filtered only endpoint types `1` and `2`, which omitted `EdgeAgentOnDockerEnvironment` (`4`) in current Portainer source. I updated the filter to include type `4` and quoted the per-endpoint JSON reads.
- The `/tmp` example claimed a `noexec` bypass that was not supported by the bind-mount references consulted. I removed that example and tightened the explanation to describe host-resource exposure and host-compromise risk more precisely.
- The Compose examples used the obsolete top-level `version` field and described an NFS-backed volume created with Docker's `local` driver as a "volume plugin". I removed the obsolete `version` lines and corrected the NFS example wording.
- The final `docker run` example had an invalid shell line continuation because a comment followed a trailing backslash. I fixed the command so it is syntactically valid.

## Review Notes
- Portainer’s current UI wording uses `Hide ...` toggles, while the API and backend models use inverse `allow...` fields. Future posts should validate both layers before reusing UI labels in API examples.
- The post’s password-based `/api/auth` example is still valid in current Portainer, but for automation Portainer also supports user-generated API access tokens from **My account**.
