# Validation Summary: How to List All Running Containers Across Environments in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine and Docker CLI
- Docker Compose specification
- Portainer API
- `jq`

## Sources Consulted
- Portainer Home documentation: https://docs.portainer.io/sts/user/home
- Portainer Containers documentation: https://docs.portainer.io/user/docker/containers
- Portainer View a container's details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer Inspect a container documentation: https://docs.portainer.io/user/docker/containers/inspect
- Portainer View container logs documentation: https://docs.portainer.io/user/docker/containers/logs
- Portainer View container statistics documentation: https://docs.portainer.io/sts/user/docker/containers/stats
- Portainer Accessing the Portainer API documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker `docker container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls
- Docker formatting reference: https://docs.docker.com/engine/cli/formatting/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose application model / file naming: https://docs.docker.com/compose/intro/compose-application-model/

## Issues Found
1. **Scope mismatch around environments**: The post implied a generic Docker-or-Kubernetes workflow for listing containers, but Portainer's `Containers` workflow for this task is documented under Docker/Swarm/Podman. I updated the description, introduction, and prerequisites to match the supported environment types and clarified that you select an environment from Portainer's Home page before listing containers.
2. **Incorrect UI navigation guidance**: The original step suggested using `Stacks` for this task. Portainer's documented flow for viewing containers is `Containers -> select the container`. I corrected the navigation steps accordingly.
3. **Obsolete Compose file version field**: The snippet used `version: "3.8"`. Docker's current Compose specification marks the top-level `version` element as obsolete and only informative, so I removed it.
4. **Portainer feature descriptions overstated current behavior**: The original text described real-time graphs/log streaming, unconditional console access, and a formatted JSON inspect view. I updated these lines to match the current docs: stats expose CPU/memory/network/I-O usage, logs support search with auto refresh, console access depends on the image having a shell, and inspect provides tree and raw JSON views.
5. **Outdated troubleshooting path**: The post referenced `Settings > Environments > Re-sync`, which I could not validate in current Portainer documentation. I replaced it with a verified check to confirm the correct environment is selected from the Home page.
6. **API authentication example used an older pattern**: The post authenticated with `/api/auth` and a bearer JWT. Current Portainer API access documentation recommends using a per-user access token in the `X-API-Key` header, so I updated the example and clarified that it lists running containers for a specific environment ID.

## Review Notes
- The remaining Docker CLI examples are syntactically valid and align with current Docker CLI documentation.
- The Compose snippet's `deploy.resources` section is valid under the Compose Deploy Specification, but Docker notes that `deploy` is optional and ignored when the target platform does not implement it.
- `docker-compose.yml` remains supported for backward compatibility, although Docker documentation prefers `compose.yaml`.
- The Portainer API example is environment-specific. Automating this across multiple environments requires repeating the request for each environment ID.
- The `docker exec -it container-name /bin/sh` example assumes the container image includes `/bin/sh`.
