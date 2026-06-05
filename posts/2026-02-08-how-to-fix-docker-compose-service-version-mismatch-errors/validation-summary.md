# Validation Summary: How to Fix Docker Compose 'Service Version Mismatch' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Docker
- Docker Compose
- Compose Specification
- YAML configuration
- Docker CLI

## Sources Consulted
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Install the Docker Compose plugin on Linux - https://docs.docker.com/compose/install/linux/
- Docker Docs: Migrate from Docker Compose V1 to V2 - https://docs.docker.com/compose/releases/migrate/
- Docker Docs: docker compose CLI reference - https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: docker compose config CLI reference - https://docs.docker.com/reference/cli/docker/compose/config/

## Issues Found
- The post described legacy Compose file versions as the current model. Updated the wording to explain that 2.x and 3.x legacy formats have been merged into the current Compose Specification.
- The manual installation command placed the Compose binary in `/usr/local/bin/docker-compose`, which installs a standalone binary rather than the `docker compose` CLI plugin. Updated it to install into the documented `cli-plugins` directory for the current user.
- The post stated that `deploy` is only available in version 3.x files and that `mem_limit`, `cpus`, and `scale` are version 2.x-only. Updated this to distinguish older Compose V1 behavior from the current Compose Specification, where these are defined attributes.
- The unsupported-options YAML example used duplicate top-level `services` keys in one document. Combined the service-level and `deploy` options under one service so the snippet is valid YAML.
- The post said Compose V2 automatically uses the latest format. Updated this to the more precise behavior: current Compose ignores the obsolete `version` field and validates against the Compose Specification.
- The migration example used `volumes_from` with an undeclared service name. Updated it to use the documented `container:` prefix for an external container.
- The migration section said `volumes_from` was removed and `extends` was only brought back later. Updated this because both are supported in the current Compose Specification, with the caveat that `extends` is not supported by `docker stack deploy`.

## Review Notes
The legacy version 2.x to 3.x migration guidance is still useful for teams maintaining old Compose V1 files, but current Compose users should prefer the versionless Compose Specification format and validate with `docker compose config`.
