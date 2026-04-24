# Validation Summary: How to Run Portainer with Read-Only Root Filesystem

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Nginx
- Container filesystem hardening

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service reference (`read_only`, `tmpfs`, `volumes`): https://docs.docker.com/reference/compose-file/services/
- Docker tmpfs mounts: https://docs.docker.com/engine/storage/tmpfs/
- Docker CLI `docker container diff`: https://docs.docker.com/reference/cli/docker/container/diff/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer volume docs, including tmpfs-backed volumes: https://docs.portainer.io/user/docker/volumes/add
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer advanced container settings docs: https://docs.portainer.io/user/docker/containers/advanced
- Portainer source: `api/cli/defaults.go`, `api/filesystem/filesystem.go`, `api/internal/ssl/ssl.go`, `api/chisel/service.go`, and `app/react/docker/containers/CreateView/ResourcesTab/toRequest.ts` in https://github.com/portainer/portainer
- NGINX official image documentation: https://hub.docker.com/_/nginx/

## Issues Found
- The Compose snippets used an obsolete top-level `version` key and mixed `tmpfs` short syntax with `size` options. I removed `version` and converted the examples to long-form `volumes` entries with `type: tmpfs`, which is the current documented way to set tmpfs size in Compose.
- The Portainer UI walkthrough claimed a standalone container flow and `Bind`-type tmpfs mapping that do not match current Portainer docs. I rewrote that section to use the documented Portainer stack editor flow and the documented tmpfs-backed volume workflow.
- The write-detection commands depended on `strace`, `apt-get`, and `inotifywait` being available inside the application container. I replaced them with `docker container diff`, which is a documented Docker command for inspecting changes in a container's writable layer.
- The writable-path table overstated defaults for Node.js, Python, and Nginx. I changed the table to "Common Writable Paths to Check" and made the entries conditional where the paths are framework- or configuration-dependent.
- The Portainer self-hosting example used outdated defaults (`9000` only, `:latest`) and unnecessary tmpfs mounts. I updated it to the current documented Portainer CE install pattern (`9443`, optional `8000`, `:sts`) while keeping `/data` writable, which is where Portainer stores its database, generated certificates, temporary working files, and chisel key material.

## Review Notes
- Portainer's current install docs default to HTTPS on port `9443`; port `9000` is now a legacy HTTP option rather than the main published port.
- Current Portainer docs and current Portainer source do not document or expose a `ReadonlyRootfs` setting in the standalone container create form, so the stack editor is the reliable documented way to apply this setting through Portainer.
