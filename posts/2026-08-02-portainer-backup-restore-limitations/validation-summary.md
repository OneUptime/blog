# Validation Summary: How to Back Up and Restore Portainer—and What the Backup Does Not Include

## Status

validated

## Post Type

Technical operations guide

## Technologies Covered

- Portainer Community Edition and Business Edition
- Docker Engine and Docker Swarm
- Docker Compose
- Docker volumes and bind mounts
- PostgreSQL Docker Official Image
- Amazon S3 and S3-compatible object storage
- Kubernetes persistent volumes and CSI snapshots
- POSIX shell commands and `tar`

## Sources Consulted

- Portainer general settings, backup, and restore: https://docs.portainer.io/admin/settings/general
- Portainer backup contents and exclusions: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer rollback procedure: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer update guidance: https://docs.portainer.io/start/upgrade
- Portainer Docker Standalone update and deployment commands: https://docs.portainer.io/start/upgrade/docker
- Portainer Docker Swarm secrets: https://docs.portainer.io/user/docker/secrets
- Docker volume backup, restore, mount, and lifecycle documentation: https://docs.docker.com/engine/storage/volumes/
- Docker bind mount behavior and constraints: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker container listing and `--all` behavior: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Go-template formatting and `println`: https://docs.docker.com/engine/cli/formatting/
- PostgreSQL Docker Official Image environment variables, secrets, and version-specific data paths: https://hub.docker.com/_/postgres
- Kubernetes CSI volume snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found

- The example used an external Docker secret without identifying the deployment as Docker Swarm. Docker secrets managed by the Docker Engine are available to Swarm services, not standalone containers, so the introductory sentence now identifies the example as a Docker Swarm stack.
- The S3 restore instructions implied that an environment-resolved credential mechanism could be used. Current Portainer documentation explicitly allows the AWS SDK credential chain for creating S3 backups, but its restore form documents an access key ID and secret access key. The restore instructions now list the documented fields and no longer overstate credential support.
- The storage inventory command used `docker ps`, which only lists running containers, while the surrounding text claimed to inventory every stack. The command now uses `docker ps --all`, and the text scopes the inventory pass to each Docker host so stopped containers and multi-host deployments are handled accurately.
- The linked Portainer rollback URL under `/faqs/troubleshooting/` returned HTTP 404. It was updated to the current official `/faqs/upgrading/` URL.

## Review Notes

- The Compose example validates successfully, and `POSTGRES_PASSWORD_FILE` plus `/var/lib/postgresql/data` are correct for the pinned `postgres:17` image. PostgreSQL 18 and later use a different version-specific `PGDATA` layout, but that does not affect this example.
- The Docker inspect template and the Alpine `tar` archive and restore commands were exercised successfully with Docker Engine 29.4.3 and Docker Compose 5.1.4. The `portainer/portainer-ce:lts` image tag also resolves to a current multi-platform manifest.
- The post correctly warns that a filesystem-level volume archive is not automatically application-consistent and that Portainer's configuration backup does not include managed workload data.
