# Validation Summary: Best Practices for Network Configuration in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Container networking
- Container logging
- Container secrets and environment variables

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: Roles - https://docs.portainer.io/admin/user/roles
- Portainer Docs: Docker roles and permissions - https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer Docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer Docs: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Docker Docs: Set environment variables within your container's environment - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Docs: Manage secrets securely in Docker Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: docker volume ls - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: docker image ls - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker Docs: docker system df - https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- Practice 2 used outdated or inaccurate Portainer UI labels. I changed `Add Stack` to `Add stack`, `Repository` to `Git Repository`, and `Auto Update` to `GitOps updates` to match current Portainer documentation.
- Practice 2 said to store all Portainer configurations in Git. I narrowed this to stack and template configurations, because Portainer's internal settings and state are not generally Git-backed in the way the post implied.
- Practice 3 showed a fictional Portainer role hierarchy (`viewer`, `developer`, `admin`) and omitted that granular RBAC is a Portainer Business Edition feature. I replaced it with Portainer's documented built-in roles and added the BE scope.
- Practice 4 recommended environment variables for passwords and API keys and included the obsolete top-level Compose `version` field. I changed the example to use environment variables for non-sensitive configuration and Compose secrets for credentials, and removed the obsolete `version` entry.
- Practice 7 described the example as structured logging and used an unsupported `tag` option with the `json-file` driver. I changed the example to Docker's recommended `local` driver with supported log rotation options.
- Practice 8 used `echo` sequences that would not reliably render newlines in Bash, hardcoded a static date, labeled dangling images as "Images without containers", and described `docker system df -v` as "Large volumes" even though it reports broader Docker disk usage. I corrected the script with `printf`, `$(date)`, and accurate labels.
- Practice 9 used an outdated/incomplete Portainer hardening example. I replaced `--ssl` with the current `--http-disabled` approach, kept the documented `--sslcert` and `--sslkey` flags, added the missing Compose `secrets` definition, switched the certificate mount to a bind mount that can actually provide cert files, and added the socket/data mounts and HTTPS port needed for a functional standalone example.

## Review Notes
- Updated Compose snippets were checked with `docker compose config` after correction.
- Practice 6 uses the Compose Deploy Specification for resource constraints. That syntax is valid, but actual enforcement depends on the target platform's implementation.
