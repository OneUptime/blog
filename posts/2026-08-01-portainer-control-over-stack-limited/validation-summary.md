# Validation Summary: Why Portainer Says “Control over This Stack Is Limited”—and How to Regain Full Control

## Status
validated

## Post Type
Technical guide / migration guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Compose
- Docker Swarm stacks
- Docker volumes, bind mounts, networks, secrets, and configs
- Portainer access control and GitOps stack deployment
- PostgreSQL Docker Official Image

## Sources Consulted
- [Portainer: Access control](https://docs.portainer.io/advanced/access-control)
- [Portainer: Stacks](https://docs.portainer.io/user/docker/stacks)
- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Inspect or edit a stack](https://docs.portainer.io/user/docker/stacks/edit)
- [Portainer: Change how you connect without losing existing stacks](https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-do-i-change-the-way-i-connect-to-an-environment-without-losing-my-existing-stacks)
- [Portainer: Recover orphaned stacks from a previously deleted environment](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment)
- [Portainer: Docker Compose files including build steps fail](https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail)
- [Docker: Docker Compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/)
- [Docker: `docker compose config`](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: `docker compose down`](https://docs.docker.com/reference/cli/docker/compose/down/)
- [Docker: Define and manage volumes in Compose](https://docs.docker.com/reference/compose-file/volumes/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: Deploy a stack to a Swarm](https://docs.docker.com/engine/swarm/stack-deploy/)
- [Docker: `docker stack ls`](https://docs.docker.com/reference/cli/docker/stack/ls/)
- [Docker: Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker Official Image: PostgreSQL](https://hub.docker.com/_/postgres)
- [PostgreSQL: Release 17.10](https://www.postgresql.org/docs/17/release-17-10.html)
- [PostgreSQL: Versioning policy](https://www.postgresql.org/support/versioning/)

## Issues Found
- The Compose inventory command used `docker ps`, which lists only running containers by default. Changed it to `docker ps --all` so stopped project containers are not missed during migration inventory.
- The inventory commands covered Docker Compose but not Docker Swarm even though the guide also covers Swarm stacks. Added `docker stack ls` and `docker stack services myapp`, with the required manager-node qualification, and clarified that node-local volumes must be inventoried on each relevant Docker host.
- The image reference `postgres@sha256:REPLACE_ME` was not a valid runnable image reference. Replaced it with a verified multi-platform digest for the current, supported PostgreSQL 17.10 Docker Official Image and added a warning to retain the image version compatible with the existing data. PostgreSQL 17.10 matches the example's `/var/lib/postgresql/data` mount target; PostgreSQL 18 and later use a different default data layout and volume target.
- The description of `docker compose down -v` omitted anonymous volumes and could imply that external volumes are removed. Updated it to state that the flag removes non-external named volumes declared in the Compose file and anonymous volumes attached to containers, while external volumes are never removed.
- The in-place handover step said only to stop the old stack, which can leave containers or services that conflict with the Portainer deployment. Changed it to remove the old workload with the original tool while preserving persistent volumes, and supplied correct Compose and Swarm examples.

## Review Notes
- The Portainer association workflow applies when the saved Portainer stack metadata can validly be associated with the replacement Docker environment; it is not a general import mechanism for externally created stacks. The post states this distinction correctly.
- Current Portainer documentation notes that Compose `build` steps are not supported for remote Docker environments. Such images should be built externally, pushed to a registry or loaded onto the remote host, and referenced by `image` before migration.
- `docker stack deploy` uses the legacy Compose v3 format rather than every feature in the current Compose Specification. The configuration shown in this post is compatible with both the current Compose parser and `docker stack config`.
- All external documentation links in the post returned HTTP 200 during validation.
