# Validation Summary: Best Practices for Registry Management in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker CLI
- Container registries

## Sources Consulted
- Portainer Documentation, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation, Roles: https://docs.portainer.io/admin/user/roles
- Portainer Documentation, Registries: https://docs.portainer.io/admin/registries
- Portainer Documentation, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Documentation, Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Use secrets in Compose: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, JSON File logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs, Customize log driver output: https://docs.docker.com/engine/logging/log_tags/
- Docker Docs, docker volume ls: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs, docker system df: https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The stack deployment steps used outdated Portainer UI labels. I changed `Repository` to `Git Repository` and `Auto Update` to `GitOps updates` to match current Portainer documentation.
- The least-privilege example used role names that are not Portainer built-in roles. I replaced it with current Portainer Business Edition roles such as `operator`, `helpdesk`, `standard_user`, `environment_administrator`, and `administrator`.
- The configuration example used a top-level Compose `version` field, which Docker documents as obsolete, and it implied that environment variables were the right place for secrets. I removed the obsolete `version` entry and changed the example to use environment variables for non-sensitive settings plus Compose secrets for sensitive data.
- The logging example described `json-file` as structured logging and used a `tag` option that is not listed as supported for the `json-file` driver. I reframed the example around log rotation and removed the unsupported option.
- The audit script hardcoded a date, used `echo` escape sequences that are not portable, and labeled `dangling=true` images as “images without containers.” I made the date dynamic, switched the headings to `printf`, and corrected the image audit step to `Dangling Images`.
- The Portainer hardening example used a `--ssl` flag that is not documented in current Portainer CLI options, used `:latest` instead of a stable tagged release, and omitted required Compose definitions and mounts. I replaced it with a valid HTTPS-only example using `--http-disabled`, `--sslcert`, `--sslkey`, `--admin-password-file`, explicit ports, the Docker socket, a data volume, and the required `secrets` and `volumes` definitions.
- The sentence “Store all Portainer configurations in Git” was broader than what the example and Portainer’s Git-backed stack workflow support. I narrowed it to stack files and template definitions.

## Review Notes
- The post is technically relevant and salvageable, but its scope is broader than registry management specifically; most practices apply to general Portainer and Docker stack operations.
- The example directory still uses `docker-compose.yml`. Docker currently prefers `compose.yaml`, but the legacy filename remains supported, so no change was required.
- The health check examples are syntactically valid, but the `curl`-based check assumes the image includes `curl`. In production, the command should match the tools available in the image.
