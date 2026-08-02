# Validation Summary: How to Migrate Portainer to a New Host Without Losing Stacks or Volumes

## Status

validated

## Post Type

Technical migration and disaster-recovery guide

## Technologies Covered

- Portainer Community Edition and Business Edition
- Docker Engine and Docker CLI
- Docker Compose and Portainer stacks
- Docker named volumes, bind mounts, tmpfs mounts, and network storage
- Docker Swarm secrets and configs
- Container registries and multi-architecture images
- S3-backed Portainer configuration backups
- Application-aware database backup and recovery

## Sources Consulted

- [Portainer: General settings, backup, and restore](https://docs.portainer.io/admin/settings/general)
- [Portainer: What does Portainer's backup include?](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: Migrate, duplicate or rename a stack](https://docs.portainer.io/user/docker/stacks/migrate)
- [Portainer: Requirements and prerequisites](https://docs.portainer.io/start/requirements-and-prerequisites)
- [Portainer: Install Portainer CE with Docker on Linux](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [Portainer: Updating on Docker Standalone](https://docs.portainer.io/start/upgrade/docker)
- [Docker: Storage overview](https://docs.docker.com/engine/storage/)
- [Docker: Volumes, including backup, restore, and migration](https://docs.docker.com/engine/storage/volumes/)
- [Docker: Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker Compose: Define and manage volumes](https://docs.docker.com/reference/compose-file/volumes/)
- [Docker Compose: Specify a project name](https://docs.docker.com/compose/how-tos/project-name/)
- [Docker Compose CLI: `docker compose config`](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker CLI: Pull an image, including pull by digest](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker CLI: Save an image](https://docs.docker.com/reference/cli/docker/image/save/)
- [Docker CLI: Load an image](https://docs.docker.com/reference/cli/docker/image/load/)
- [Docker CLI: Inspect a container](https://docs.docker.com/reference/cli/docker/container/inspect/)
- [Docker CLI: Format command and log output](https://docs.docker.com/engine/cli/formatting/)

## Issues Found

- The image-pull example used an abbreviated digest containing an ellipsis. Docker image references require a complete digest, so the example was changed to use a syntactically complete 64-hex-character SHA-256 value.
- The checksum was created for `volume-backups/app_uploads.tar.gz`, but the restore example checked `app_uploads.tar.gz.sha256` from the working directory and mounted the working directory at `/backup`. That path mismatch would make the documented sequence fail. The verification path and bind mount were changed to consistently use the `volume-backups` directory.

## Review Notes

- Portainer's current documentation confirms that its backup contains Portainer configuration and Portainer-managed stack files, but not containers, images, volumes, bind-mounted application data, or Docker/Kubernetes configuration outside Portainer's database.
- Portainer's stack migration documentation confirms that persistent-volume content is not relocated by stack migration. The post correctly treats workload data migration as a separate operation.
- The Portainer restore flow, Business Edition-only S3 restore qualification, empty `/data` requirement, Docker socket behavior, and standalone CE deployment skeleton are consistent with current Portainer documentation.
- The Docker Compose `external: true` plus `name` example is valid and correctly avoids project-name scoping. The `docker compose config --images` and `--volumes` options are current.
- The Docker commands and shell syntax were cross-checked against Docker client 29.4.3, Docker Compose v5.1.4, and the installed `shasum` help. All remaining snippets are syntactically valid.
- Tags such as `portainer/portainer-ce:lts`, `postgres:17`, and `alpine` are mutable. The post already mitigates this where operationally important by directing readers to inventory exact tags, preserve expected image digests, consult the current Portainer support matrix, and use the intended release and topology.
