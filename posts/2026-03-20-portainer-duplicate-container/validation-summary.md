# Validation Summary: How to Duplicate a Container in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker containers
- Docker Compose
- Nginx
- Docker networking

## Sources Consulted
- Portainer documentation, "Edit or duplicate a container": https://docs.portainer.io/2.27/user/docker/containers/edit
- Portainer documentation, "Containers" (2.33 LTS): https://docs.portainer.io/2.33-lts/user/docker/containers
- Docker documentation, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Docker documentation, "Networking in Compose": https://docs.docker.com/compose/how-tos/networking/
- Docker documentation, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation, "docker compose up": https://docs.docker.com/reference/cli/docker/compose/up/
- Docker documentation, "Why use Compose?": https://docs.docker.com/compose/intro/features-uses/

## Issues Found
- The Compose examples used the obsolete top-level `version` field and the legacy `docker-compose.yml` filename in the snippet comment. Docker now treats `version` as obsolete and prefers `compose.yaml`, so the snippet was updated accordingly.
- The scaling examples used `deploy.replicas`, which is part of the broader deploy specification, even though the surrounding text described plain Docker Compose usage. The examples were updated to use the current Compose `scale` field and the wording was tightened to describe Compose as a repeatable single-host scaling/deployment tool.
- The Portainer comparison table incorrectly said editing a container with the same name requires removing the old container first. Portainer's official docs state that editing via `Duplicate/Edit` creates a new container and replaces the original after confirmation, so the table was corrected.
- The Nginx comment claimed Docker DNS resolves the `web` service name to all container IPs. The Docker docs consulted support reaching services by service name on the Compose network, but not that stronger claim in this specific example, so the wording was narrowed to the documented behavior.

## Review Notes
- No remaining technical issues after the corrections above.
- Docker Compose still supports `docker-compose.yml` for backward compatibility, but Docker documentation now prefers `compose.yaml`.
- The Nginx snippet is an excerpt, not a complete standalone `nginx.conf`.
