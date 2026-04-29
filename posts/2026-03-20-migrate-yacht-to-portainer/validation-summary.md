# Validation Summary: How to Migrate from Yacht to Portainer

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Yacht (SelfhostedPro Docker UI)
- Portainer CE
- Docker (containers, volumes, images)
- Docker Compose (v3.8 schema)
- Portainer App Templates (JSON format)
- Bash / shell scripting

## Sources Consulted
- Portainer CE installation docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer App Templates format: https://docs.portainer.io/advanced/app-templates/format
- Yacht repository: https://github.com/SelfhostedPro/Yacht
- Docker CLI reference (`docker run`, `docker inspect`, `docker ps`, `docker volume`)
- Docker Compose file specification (version 3.8)

## Issues Found
- The "Documenting Existing Applications" snippet wrote container configs to `/tmp/container-configs/` without first creating the directory, which would cause the redirection to fail on first run. Added `mkdir -p /tmp/container-configs` before the loop so the script works as written.

## Review Notes
- The Portainer install command omits `-p 8000:8000`. That port is only required for Edge agent tunnel connectivity, so leaving it out is acceptable for the basic Portainer-on-a-single-host scenario described here. Readers who later want to use Edge features (called out as "Yes" in the comparison table) will need to expose 8000 as well.
- The custom template JSON uses `"ports": ["80/tcp", "81/tcp", "443/tcp"]`, which is a valid Portainer template format but only declares the container ports without specifying host port bindings. Users deploying from this template will need to confirm host port mappings in the Portainer UI. This is a stylistic choice consistent with several official Portainer templates, so it has been left as-is.
- The Yacht image `selfhostedpro/yacht:latest` is correct. Note that upstream Yacht development has slowed (the README warns the project "has not been updated in a while"), which actually reinforces the post's premise that migrating away is reasonable.
- Compose file version `'3.8'` is valid; the modern Compose Specification no longer requires the `version` key, but including it remains backward-compatible and does not break anything.
