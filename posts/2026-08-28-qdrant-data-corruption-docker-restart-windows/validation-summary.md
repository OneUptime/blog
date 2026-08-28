# Validation Summary: Why Qdrant Data Disappears or Corrupts After a Docker Restart on Windows

## Status

validated

## Post Type

Troubleshooting and data-persistence guide

## Technologies Covered

- Qdrant v1.19.0
- Docker Engine and Docker CLI
- Docker Compose
- Docker Desktop for Windows
- Windows Subsystem for Linux (WSL)
- Docker bind mounts and named volumes
- Qdrant collection snapshots and recovery
- PowerShell and Compose YAML

## Sources Consulted

- [Qdrant troubleshooting: incompatible file systems and Windows/WSL mounts](https://qdrant.tech/documentation/operations/common-errors/)
- [Qdrant installation documentation](https://qdrant.tech/documentation/installation/)
- [Qdrant local quickstart](https://qdrant.tech/documentation/quickstart/)
- [Qdrant snapshots and recovery](https://qdrant.tech/documentation/operations/snapshots/)
- [Qdrant migration and recovery options](https://qdrant.tech/documentation/migration-recovery-options/)
- [Qdrant v1.19.0 release](https://github.com/qdrant/qdrant/releases/tag/v1.19.0)
- [Docker volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker container run reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker CLI output formatting](https://docs.docker.com/engine/cli/formatting/)
- [Docker container inspect reference](https://docs.docker.com/reference/cli/docker/container/inspect/)
- [Docker Compose service volume syntax](https://docs.docker.com/reference/compose-file/services/#volumes)
- [Docker Compose top-level volumes and explicit names](https://docs.docker.com/reference/compose-file/volumes/)
- [Docker Compose project names](https://docs.docker.com/compose/how-tos/project-name/)
- [Docker Compose `down`](https://docs.docker.com/reference/cli/docker/compose/down/)
- [Docker Compose `ps`](https://docs.docker.com/reference/cli/docker/compose/ps/)
- [Docker Compose `logs`](https://docs.docker.com/reference/cli/docker/compose/logs/)

## Issues Found

- The opening described the documented corruption symptom as files containing zeros. Qdrant's troubleshooting documentation specifically says vector data may be lost or set to all zeros after a restart. Changed the wording to describe vector data accurately.
- The forensic procedure copied raw storage after stopping application writes but did not explicitly stop Qdrant itself. Added that stop so background flush or optimization activity cannot change the files while the forensic copy is taken.
- The inspection commands used the literal container name `qdrant`, which is correct for the shown `docker run --name qdrant` commands but not necessarily for the shown Compose deployment. Added instructions to find Compose's generated container name or ID with `docker compose ps --all` and obtain service logs with `docker compose logs qdrant`.

## Review Notes

- `qdrant/qdrant:v1.19.0` is a valid image tag and corresponds to the Qdrant v1.19.0 release available on the validation date.
- Starting with Qdrant v1.15.0, Qdrant performs a runtime filesystem compatibility check. An error from that check means it is unsafe to continue with the current storage configuration.
- Qdrant documents a snapshot restore compatibility limit: restore to the same minor version at the same or a newer patch level, or to the next minor version. Keep a compatible Qdrant image available for recovery drills.
- Collection snapshots omit aliases; whole-storage snapshots include them but are only suitable for single-node deployments. The post correctly discusses collection snapshots.
- In the Docker image, snapshots default to `/qdrant/snapshots`, which is separate from `/qdrant/storage`. A snapshot must be downloaded, copied, or placed on separately persistent storage before the container holding its only copy is removed.
- The shown Compose volume is non-external, so `docker compose down -v` removes it. Docker does not remove volumes declared as external.
