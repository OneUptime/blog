# Validation Summary: Fixing Portainer stack.env and .env Variable Substitution in Git Stacks

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Portainer Git stacks and GitOps updates
- Docker Compose
- Docker Swarm and `docker stack deploy`
- Compose interpolation and container environment variables
- Docker secrets and configs

## Sources Consulted

- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Environment Variable Management in Docker: .env vs. stack.env](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env)
- [Portainer: How do automatic updates for stacks/applications work?](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Portainer: Inspect or edit a stack](https://docs.portainer.io/user/docker/stacks/edit)
- [Portainer 2.39.5 source: Stack environment-variable help text](https://github.com/portainer/portainer/blob/2.39.5/app/react/components/form-components/EnvironmentVariablesFieldset/StackEnvironmentVariablesPanel.tsx)
- [Portainer maintainer discussion: Git-stack `stack.env` behavior since 2.19](https://github.com/orgs/portainer/discussions/10553)
- [Docker: Set, use, and manage variables in a Compose file with interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Docker: Set environment variables within a container](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/)
- [Docker: Environment variables precedence in Docker Compose](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/)
- [Docker: `docker compose config` CLI reference](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: Deploy a stack to a swarm](https://docs.docker.com/engine/swarm/stack-deploy/)
- [Docker: Manage sensitive data with Docker secrets](https://docs.docker.com/engine/swarm/secrets/)
- [Docker: Store configuration data using Docker configs](https://docs.docker.com/engine/swarm/configs/)

## Issues Found

- The post incorrectly described `stack.env` as a Portainer-managed file for Git-backed stacks. It was corrected to distinguish deployment methods: Portainer auto-creates the file from UI values for Web editor, Upload, and Custom template deployments, while Repository deployments require `stack.env` to already exist in Git. UI-managed Git-stack variables remain interpolation inputs and are not written into the repository file or automatically injected into containers.
- The interpolation explanation said interpolation could affect any YAML value. It was narrowed to unquoted and double-quoted YAML values because Compose does not interpolate single-quoted values.
- The security guidance grouped Docker configs with Docker secrets as storage for passwords, tokens, and private keys. It was corrected to recommend Docker secrets for sensitive values and Docker configs only for non-sensitive file-shaped configuration because configs are not encrypted at rest.
- The troubleshooting checklist said an override Compose file could replace an `environment` or `env_file` entry, which overstated the default merge behavior. It now directs readers to consider changes under Compose's merge rules because mappings are merged and sequences such as `env_file` are normally appended unless an explicit override/reset mechanism is used.

## Review Notes

- All Compose snippets parsed successfully with Docker Compose v5.1.4.
- The documented `docker compose config --environment`, `config`, and `config --images` commands and flags are current.
- Portainer's current UI source explicitly says Repository deployments require `stack.env` to reside in Git, while Web editor, Upload, and Custom template deployments auto-create it. Its add-stack documentation separately limits the auto-created pattern to Docker Standalone and Podman and says to define Swarm environment variables individually.
- All six links in the post's Official Documentation section returned HTTP 200 during validation.
