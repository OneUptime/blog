# Validation Summary: Best Practices for Template Management in Portainer - Templates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Compose Specification
- Git-based stack deployment
- Bash shell scripting

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer roles and RBAC docs: https://docs.portainer.io/admin/user/roles
- Portainer CLI configuration docs: https://docs.portainer.io/advanced/cli
- Portainer SSL certificate docs: https://docs.portainer.io/advanced/ssl
- Portainer requirements and supported releases: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker JSON file logging driver reference: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker volume list CLI reference: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker image list CLI reference: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker container list CLI reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker system disk usage CLI reference: https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The stack deployment walkthrough used outdated Portainer UI terminology. I changed `Repository` to `Git Repository` and `Auto Update` to `GitOps updates` to match the current Portainer workflow.
- The least-privilege example used role names that do not match Portainer's built-in roles. I replaced the invented `viewer`, `developer`, and `admin` hierarchy with current Portainer role names and capabilities from the official RBAC documentation.
- The Compose example included a top-level `version: "3.8"` field. I removed it because the current Compose Specification marks `version` as obsolete.
- The logging snippet used the `json-file` driver together with a `tag` option and described the example as structured logging. I removed the unsupported `tag` option and clarified that the snippet is configuring log rotation.
- The audit script hardcoded a stale date string and used `echo "\n..."`, which is not reliable without escape interpretation being enabled. I switched the script to `printf`, generated the date dynamically, and kept the commands equivalent.
- The audit labels did not match the Docker commands being run. I changed `Images without containers` to `Dangling Images` and `Large volumes` to `Disk Usage Details` so the labels describe the actual command output.
- The Portainer hardening example used an invalid `--ssl` flag. I replaced it with the documented `--http-disabled` flag and updated the image tag to the supported `:lts` release stream used in current Portainer documentation.

## Review Notes
- Portainer's more granular RBAC roles such as `Operator` and `Environment Administrator` are Business Edition capabilities; Community Edition uses a simpler access model.
- The health check example that uses `curl` assumes the application image includes `curl`.
- The `deploy.resources` example uses valid Compose Deploy Specification syntax, but actual enforcement can vary by target platform and runtime support.
