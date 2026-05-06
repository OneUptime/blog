# Validation Summary: Best Practices for User and Team Management in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Business Edition RBAC
- Docker Compose
- Docker CLI
- Docker logging drivers
- Docker secrets
- Git-based stack deployments / GitOps updates

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer docs: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs: Roles - https://docs.portainer.io/admin/user/roles
- Portainer docs: Docker roles and permissions - https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer docs: Manage access to environments - https://docs.portainer.io/sts/admin/environments/access
- Portainer docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer docs: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Portainer docs: Deprecated and removed features - https://docs.portainer.io/2.21/advanced/deprecated
- Docker docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker docs: Set environment variables within your container's environment - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker docs: Secrets in Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker docs: `docker volume ls` - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker docs: `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker docs: `docker image ls` - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker docs: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The Git deployment steps used outdated Portainer UI labels. I changed `Repository` to `Git repository`, replaced the loose `branch` wording with `repository URL, reference, and Compose path`, and updated `Auto Update` to the current `GitOps updates` terminology.
- The least-privilege section used non-Portainer role names such as `viewer`, `developer`, and `admin`, and implied permissions that do not match Portainer’s built-in RBAC model. I replaced them with the documented Portainer roles and aligned the permissions with the official role descriptions.
- The RBAC example was written as if it applied to all editions. I corrected the lead-in to make clear that granular RBAC roles are a Portainer Business Edition feature.
- The configuration section treated environment variables as the recommended mechanism for sensitive data and used the obsolete Compose `version` field. I removed the obsolete `version` line, changed the example to non-secret configuration values, and clarified that secrets should use Docker secrets where supported.
- The logging section claimed to configure structured logging, but the example actually configured file rotation, and it used a `json-file` `tag` option that is not documented for that driver. I corrected the description to log rotation and switched the example to Docker’s `local` logging driver with supported rotation options.
- The audit script used static timestamps, `echo` escape sequences that are not portable, and mislabeled dangling images as “images without containers”. I changed the script to use `printf`, generate the date dynamically, and label the image output correctly.
- The Portainer hardening example used the deprecated `--ssl` flag even though HTTPS is enabled by default in modern Portainer. I replaced it with `--http-disabled`, kept the supported `--sslcert` and `--sslkey` flags, clarified that `--admin-password-file` is only for first startup, and completed the Compose snippet so it includes the required ports, socket/data mounts, and secret definition.

## Review Notes
- The corrected Compose fragments were sanity-checked locally with `docker compose config` using Docker Compose v5.1.3.
- The post’s `deploy.resources` example remains valid Compose syntax, but support for `deploy` semantics can vary by target platform. Readers should confirm behavior on the specific environment Portainer is managing.
- The directory examples still use `docker-compose.yml`, which remains supported, although current Docker documentation prefers `compose.yaml`.
