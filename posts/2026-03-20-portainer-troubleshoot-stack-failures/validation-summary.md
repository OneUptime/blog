# Validation Summary: How to Troubleshoot Stack Deployment Failures in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker Swarm
- YAML

## Sources Consulted
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose variable interpolation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose multiple-file merge behavior: https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker container listing and exit-code examples: https://docs.docker.com/reference/cli/docker/container/ls
- Docker container logs reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker secret ls reference: https://docs.docker.com/reference/cli/docker/secret/ls/
- Docker secret create reference: https://docs.docker.com/reference/cli/docker/secret/create/
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer registry documentation: https://docs.portainer.io/admin/registries/add
- Portainer Docker secrets documentation: https://docs.portainer.io/user/docker/secrets
- Portainer agent installation documentation: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer agent repository README: https://github.com/portainer/agent

## Issues Found
- Exit code `137` was described as specifically meaning the OOM killer. I changed this to `SIGKILL (often OOM or a forced stop)` because Docker documents `137` as a SIGKILL exit code, with OOM being only one possible cause.
- The environment-variable example said `${DATABASE_URL}` would fail if unset. I corrected this to note that Docker Compose resolves an unset variable to an empty string, which can then cause application startup failures.
- The network-conflict example renamed a network key but did not attach any service to it, and it did not guarantee a unique actual network name. I updated the snippet so the service uses the custom network and the network has a unique `name`.
- The secrets troubleshooting commands were written as though they applied generally. I scoped `docker secret ls` and `docker secret create` to Docker Swarm and added a note that Compose-based standalone stacks should define secrets in the Compose file instead.
- The override-file guidance used `docker-compose.override.yml` in a way that did not match current Docker Compose and Portainer stack deployment behavior. I changed this to a second Compose file (`compose.debug.yaml`) and documented the supported merge approach with `-f` locally or Portainer **Additional paths** for Git-based stacks.
- I clarified the Portainer agent connectivity check by noting that the `/ping` probe should return HTTP `204`.

## Review Notes
- Local Docker CLI binaries were not available in the review environment, so command syntax and behavior were verified against the official Docker and Portainer references instead of local `--help` output.
- Portainer documents the traditional Portainer Agent as a legacy option and recommends the Edge Agent for most modern remote deployments. The agent connectivity troubleshooting step is still technically valid for environments that use the traditional agent.
