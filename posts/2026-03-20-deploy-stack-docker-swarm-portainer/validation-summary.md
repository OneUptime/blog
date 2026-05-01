# Validation Summary: How to Deploy a Stack on Docker Swarm via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Docker stack CLI
- Portainer
- Compose file format for Swarm stacks
- YAML configuration

## Sources Consulted
- Docker CLI reference for `docker stack deploy`: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Swarm tutorial for stack deployment: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker CLI reference for `docker stack ls`: https://docs.docker.com/reference/cli/docker/stack/ls/
- Docker CLI reference for `docker stack services`: https://docs.docker.com/reference/cli/docker/stack/services/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose file `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer documentation for adding a stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer documentation for inspecting and editing a stack: https://docs.portainer.io/user/docker/stacks/edit

## Issues Found
1. **Stack file format wording was too broad.** The post said Swarm stacks are defined using “Compose v3 files,” but Docker’s current docs are more specific: `docker stack deploy` uses the legacy Compose file version 3 format, not the latest Compose Specification. Updated the definition and prerequisite wording to reflect that.
2. **Stack naming guidance was unsupported and overly restrictive.** The post told readers to use a lowercase stack name with no spaces. Portainer’s documentation only requires a descriptive name here, so I removed the unsupported restriction.
3. **CLI examples were missing the manager-node requirement.** Docker documents `docker stack deploy`, `docker stack ls`, and `docker stack services` as Swarm cluster-management commands that must be run on a manager node. Added that note above the CLI example block.
4. **The stack update workflow was inaccurate for Git-backed stacks.** The original text implied all stacks can be edited directly in Portainer, but Portainer documents that Git-deployed stacks must be updated in the repository and then pulled/redeployed, unless you detach them from Git. Updated the section accordingly.
5. **Rolling update ownership was attributed to the wrong component.** The original post said Portainer handles the rolling update automatically. In practice, Portainer triggers the redeploy and Docker Swarm applies the update behavior defined in the stack, including `deploy.update_config`. Updated the wording to reflect that behavior accurately.

## Review Notes
- The example Compose YAML is syntactically valid for a Swarm stack and uses valid `deploy.replicas`, `update_config`, `restart_policy`, `ports`, and `overlay` network settings.
- The `docker stack deploy -c docker-compose.yml my-stack`, `docker stack ls`, and `docker stack services my-stack` commands are valid and current.
- The environment-variable example is valid for Portainer’s environment variable injection workflow. Portainer also notes that `env_file` via `stack.env` is not supported on Docker Swarm because `docker stack deploy` does not support `env_file`, but this post does not rely on that pattern.
- The post does not pin a Portainer version. The UI paths and behaviors validated here match the current Portainer 2.39 LTS documentation as of 2026-05-01.
