# Validation Summary: Why a Stack Works with docker compose but Fails in Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Portainer
- Docker Engine and Docker contexts
- Docker Compose
- Docker Swarm and `docker stack deploy`
- Compose interpolation and environment files
- Container image builds and registries
- Bind mounts, named volumes, networks, secrets, and configs
- Docker and Portainer security controls

## Sources Consulted

- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: How automatic stack updates work](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Portainer: Environment variables, `.env`, and `stack.env`](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env)
- [Portainer: How relative path support works](https://docs.portainer.io/advanced/relative-paths)
- [Portainer: Compose build steps on remote environments](https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail)
- [Portainer: Docker Standalone security settings](https://docs.portainer.io/user/docker/host/setup)
- [Portainer: Docker Swarm security settings](https://docs.portainer.io/user/docker/swarm/setup)
- [Docker: `docker compose config`](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: Variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: Deploy a stack to Swarm](https://docs.docker.com/engine/swarm/stack-deploy/)
- [Docker: `docker stack deploy`](https://docs.docker.com/reference/cli/docker/stack/deploy/)
- [Docker: Compose Deploy Specification](https://docs.docker.com/reference/compose-file/deploy/)
- [Docker: Compose `extends`](https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/)
- [Docker: Swarm services, mounts, and named-volume behavior](https://docs.docker.com/engine/swarm/services/)
- [Docker: External networks in Compose](https://docs.docker.com/compose/how-tos/networking/#use-an-existing-network)
- [Docker: External volumes in Compose](https://docs.docker.com/reference/compose-file/volumes/#external)
- [Docker: Registry client certificates](https://docs.docker.com/engine/security/certificates/)
- [Docker: `docker stack ps`](https://docs.docker.com/reference/cli/docker/stack/ps/)
- [Docker: `docker service logs`](https://docs.docker.com/reference/cli/docker/service/logs/)
- [Docker CLI source: legacy stack Compose schema](https://github.com/docker/cli/blob/master/cli/compose/schema/data/config_schema_v3.13.json)
- [Docker CLI source: legacy stack loader and environment-file resolution](https://github.com/docker/cli/blob/master/cli/compose/loader/loader.go)
- [Docker CLI source: unsupported and deprecated stack properties](https://github.com/docker/cli/blob/master/cli/compose/types/types.go)

## Issues Found

- The output-safety warning mentioned the full rendered model but did not explicitly cover `docker compose config --environment`, which directly prints interpolation names and values. The warning now calls out that option.
- The post generalized Portainer's Swarm limitation for the special `stack.env` file into a claim that service `env_file` is universally unsupported by `docker stack deploy`. Docker's legacy stack schema accepts string-form `env_file` entries and resolves their contents at deployment time. The text now scopes the limitation and migration advice to Portainer's special `stack.env` mechanism.
- The external-volume explanation applied Docker Compose's Standalone validation semantics to Swarm. Swarm can create an ordinary missing named volume on the node where a task is scheduled, and manager-local volume inspection does not prove cluster-wide data availability. The section now distinguishes Standalone external resources from Swarm network, secret, config, and node-scoped volume behavior.
- The `container_name` conflict advice did not distinguish executors. The text now scopes explicit container-name collisions to Docker Standalone and notes that Swarm ignores `container_name` while published service ports can still conflict.
- The Swarm diagnostics presented `docker service logs` without its logging-driver limitation. The post now states that the command works only with the `json-file` and `journald` drivers and points readers to the configured logging backend for other drivers.

## Review Notes

- Portainer's remote Compose build limitation is version-sensitive. The current known-issues page identifies Portainer 2.29.2 and later and recommends external builds; this should be rechecked if Portainer changes its remote build implementation.
- `docker stack deploy` still uses the legacy Compose version 3 model rather than the complete current Compose Specification. Modern Compose-only fields must continue to be checked individually for Swarm compatibility.
- All external documentation links in the post returned HTTP 200 during validation on 2026-08-02.
