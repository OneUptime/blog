# Validation Summary: How to Upgrade Portainer Without Losing Users, Environments, or Stack Definitions

## Status

validated

## Post Type

Technical operations guide

## Technologies Covered

- Portainer Community Edition and Business Edition
- Portainer Server, Agent, and Edge Agent
- Docker Engine and Docker Standalone
- Docker Compose and Docker Swarm
- Kubernetes and Helm
- Persistent volumes, bind mounts, backups, database migrations, and rollback

## Sources Consulted

- [Portainer: Updating Portainer](https://docs.portainer.io/start/upgrade)
- [Portainer: Updating on Docker Standalone](https://docs.portainer.io/start/upgrade/docker)
- [Portainer: Updating on Docker Swarm](https://docs.portainer.io/start/upgrade/swarm)
- [Portainer: Updating on Kubernetes](https://docs.portainer.io/start/upgrade/kubernetes)
- [Portainer: Updating from Portainer 1.x](https://docs.portainer.io/start/upgrade/from-1.x)
- [Portainer: Lifecycle policy](https://docs.portainer.io/start/lifecycle)
- [Portainer: Portainer architecture](https://docs.portainer.io/start/architecture)
- [Portainer: General Settings—Back up Portainer](https://docs.portainer.io/admin/settings/general#back-up-portainer)
- [Portainer: What does Portainer's backup include?](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: How can I roll back to a previous version of Portainer?](https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer)
- [Portainer: Why have my agents stopped working after upgrading Portainer?](https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer)
- [Docker: docker inspect](https://docs.docker.com/reference/cli/docker/inspect/)
- [Docker: Format command and log output](https://docs.docker.com/engine/cli/formatting/)
- [Docker: docker volume inspect](https://docs.docker.com/reference/cli/docker/volume/inspect/)
- [Docker: Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker: docker container run](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker: docker container logs](https://docs.docker.com/reference/cli/docker/container/logs/)
- [Docker: docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/)

## Issues Found

- The inventory text said the `docker inspect` command captured environment variables, but its format omitted `.Config.Env`. Added `env={{json .Config.Env}}` so the command captures the stated configuration, and noted that the resulting output is sensitive because it can contain secrets.
- The inventory example unconditionally inspected a volume named `portainer_data`, even though the post correctly explains that `/data` can use a differently named volume or a bind mount. Made volume inspection conditional and changed the argument to an explicit placeholder for the actual named volume reported by `docker inspect`.
- The Portainer 1.x guidance omitted the required first migration step for older installations. Clarified that versions before 1.24.1 must update to 1.24.2, then 1.24.1 or 1.24.2 must update to 2.0.0 before proceeding to a current release.

## Review Notes

- The Docker Standalone CE commands match Portainer's current LTS upgrade procedure for the recommended default installation, including ports 8000 and 9443 and reuse of `portainer_data` at `/data`.
- Portainer's documentation currently requires Agent versions to match the Server version and recommends updating the Server before the Agents. Preserving a custom `AGENT_SECRET` on both sides is correct.
- The backup and restore boundaries are accurate: the archive contains Portainer configuration, its database, and Portainer-deployed stack files, but not managed containers, images, volumes, bind-mounted application data, or external Docker/Kubernetes configuration.
- The rollback warning is accurate: an older Portainer version cannot use a database migrated by a newer version, so rollback requires a compatible pre-upgrade backup or Portainer's automatic database backup procedure.
