# Validation Summary: Best Practices for Organizing Environments in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Engine / Docker CLI
- Git-backed stack deployments
- Container health checks
- Container logging

## Sources Consulted
- Portainer documentation, `Add a new stack`: https://docs.portainer.io/user/docker/stacks/add
- Portainer documentation, `Roles`: https://docs.portainer.io/admin/user/roles
- Portainer documentation, `CLI configuration options`: https://docs.portainer.io/advanced/cli
- Portainer documentation, `Using your own SSL certificate with Portainer`: https://docs.portainer.io/advanced/ssl
- Docker documentation, `Use secrets`: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose file reference, `Version top-level element (obsolete)`: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation, `JSON File logging driver`: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker CLI reference, `docker image ls`: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference, `docker compose file deploy reference`: https://docs.docker.com/reference/compose-file/deploy/
- Local Docker CLI help: `docker volume ls --help`, `docker images --help`, `docker system df --help`
- Local Bash built-in help: `help echo`, `help printf`

## Issues Found
- The stack deployment steps used outdated or inexact Portainer UI labels. I changed `Repository` to `Git repository`, `Auto Update` to `GitOps updates`, and matched the current `Add stack` label from Portainer's documentation.
- The access-control example used role names that are not Portainer built-ins (`viewer`, `developer`, `admin`) and mixed them with behaviors Portainer documents differently. I replaced that block with current Portainer Business Edition role names and corrected their scope.
- The environment-variable section treated environment variables as the right place for secrets and included the obsolete top-level Compose `version` field. I updated the guidance so environment variables are used for non-sensitive settings and hardcoded secrets are called out explicitly.
- The resource-limit section implied that `deploy.resources` applies everywhere. I added the needed caveat that this applies to Compose deployments that support the `deploy` section.
- The logging example included `tag` under the `json-file` driver, which is not a documented `json-file` option. I removed it and reframed the section around log rotation, which is what the snippet actually configures.
- The audit script hardcoded a timestamp, used `echo "\n..."` in a way that does not emit a newline in Bash without `-e`, labeled dangling images as `Images without containers`, and labeled `docker system df -v` as `Large volumes` even though it reports broader disk-usage details. I corrected the script accordingly.
- The Portainer hardening example used a nonexistent `--ssl` flag and was not a complete working Compose example. I replaced it with current Portainer CLI flags and added the mounts, ports, top-level `secrets`, and persistent `data` volume needed for the example to work as shown.

## Review Notes
- The post is now technically correct for Docker-focused Portainer environments.
- Portainer's more advanced RBAC role set is a Business Edition feature; Community Edition users rely on a smaller permission model plus teams and resource controls.
- The post is tagged with Kubernetes, but its concrete examples are Docker and Compose oriented rather than Kubernetes specific.
