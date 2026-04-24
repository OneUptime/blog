# Validation Summary: How to Manage Docker Configs in Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Configs
- Docker CLI
- Compose/Stack YAML
- Bash
- Nginx

## Sources Consulted
- Docker Docs: Store configuration data using Docker Configs — https://docs.docker.com/engine/swarm/configs/
- Docker Docs: docker config create — https://docs.docker.com/reference/cli/docker/config/create/
- Docker Docs: docker config inspect — https://docs.docker.com/reference/cli/docker/config/inspect/
- Docker Docs: docker config ls — https://docs.docker.com/reference/cli/docker/config/ls/
- Docker Docs: docker config rm — https://docs.docker.com/reference/cli/docker/config/rm/
- Docker Docs: docker service create — https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update — https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker stack deploy — https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Configs top-level element — https://docs.docker.com/reference/compose-file/configs/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Portainer Docs: Configs — https://docs.portainer.io/user/docker/configs
- Portainer Docs: Add a new config — https://docs.portainer.io/user/docker/configs/add
- Portainer Docs: Remove a config — https://docs.portainer.io/user/docker/configs/remove
- Portainer Docs: Services — https://docs.portainer.io/user/docker/services

## Issues Found

1. **The Portainer navigation path was outdated.** Current Portainer docs expose configs from a dedicated `Configs` menu for Docker Swarm environments, not `Swarm > Configs`. Updated Step 1 accordingly.

2. **The CLI prerequisite was incomplete.** Docker documents `docker config` and `docker service update` as Swarm cluster-management commands that must be run on a manager node. Added that prerequisite.

3. **The file mode example was misleading.** The post used `0644` as an example mode for a Docker config. Docker documents configs as world-readable by default (`0444`), and writable bits are ignored for configs. Updated the example to `0444`.

4. **The Compose wording did not match the example.** The text said the config was defined "inline", but the example used `file: ./nginx.conf`, which creates the config from a local file. Updated the wording to match the snippet.

5. **The version-rotation script only worked for the first update.** It always removed `nginx-config`, even though the section recommends versioned config names. After one rotation, the currently attached config would be versioned, so the script would target the wrong config name. Updated the script to track the currently attached config separately from the base naming prefix.

6. **The cleanup example misdescribed the command output.** `docker config ls --format '{{.Name}}'` lists all configs, not only configs unused by services. Corrected the comment.

7. **The two create examples reused the same config name.** Running both examples as written would cause the second `docker config create` to fail because the same config name was already used. Changed the stdin example to a distinct config name and labeled it as an alternative.

## Review Notes
- Docker's current Swarm configs documentation contains some wording tension: it describes configs as "not encrypted at rest" while also stating that config data is stored in the swarm Raft log, which is encrypted. The post's practical guidance remains sound: treat configs as non-sensitive and use Docker Secrets for sensitive data.
- The stack YAML examples are appropriate for Swarm/Portainer stack deployments. Docker also documents that Swarm configs are available to swarm services, not standalone containers.
- The local review environment did not have the `docker` CLI installed, so command verification relied on official Docker documentation rather than local `--help` output.
