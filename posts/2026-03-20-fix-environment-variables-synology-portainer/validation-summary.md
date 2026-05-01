# Validation Summary: How to Fix Environment Variable Issues on Synology with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Synology DSM
- Synology Docker / Container Manager
- Portainer
- Docker Compose
- Docker CLI environment inspection
- Environment variables and `.env` files

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Docker Docs: Set, use, and manage variables in a Compose file with interpolation — https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs: Set environment variables within your container's environment — https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Docs: Environment variables precedence in Docker Compose — https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker container exec — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: Running containers — https://docs.docker.com/engine/containers/run/
- Docker Docs: Manage sensitive data with Docker secrets — https://docs.docker.com/engine/swarm/secrets/
- Synology: DiskStation Manager 7.2 — https://www.synology.com/en-us/DSM72

## Issues Found
- The introduction attributed environment variable problems to Synology-specific string handling and a limited shell environment. I changed that to documented Docker Compose interpolation and precedence behavior, and added the DSM 6.2 versus DSM 7.2 package naming distinction.
- The common-issues list overstated several Synology-specific failure modes. I replaced those bullets with documented issues around Compose interpolation, `environment` versus `env_file` precedence, and hard-coded values, and removed the unsupported claim that multi-line values are silently truncated.
- The special-characters section incorrectly advised avoiding special characters entirely. I corrected it to show Docker Compose `$` interpolation rules and proper quoting for `.env` files.
- The stack example used the obsolete top-level `version: "3.8"` field and hard-coded the password in the compose snippet. I removed the obsolete `version` field and changed the example to use `${DB_PASS}`.
- The `.env` section incorrectly said users should place an `.env` file in Portainer stack storage and that Synology requires an absolute path. I replaced that with Portainer's documented `Load variables from .env file` workflow.
- The package-update section assumed the Synology package is always named `Docker`. I corrected this to `Docker` on DSM 6.2 and `Container Manager` on DSM 7.2 and later.
- The final section incorrectly said DSM injects conflicting host environment variables into containers. I rewrote it to reflect Docker's documented automatic container variables and Compose precedence rules instead.

## Review Notes
- `docker exec <container-name> env | sort` is valid Docker CLI syntax, but it assumes the container image includes an `env` executable.
- Portainer documents different behavior for stack environment files on Docker Standalone versus Docker Swarm. In particular, `env_file` support for `stack.env` does not apply to Swarm deployments that use `docker stack deploy`.
- Docker Compose documents support for single-quoted multi-line values in `.env` files, which is why the original truncation claim was removed.
- The post's practical troubleshooting advice is now technically grounded, but the verified behavior comes primarily from Docker and Portainer documentation rather than Synology-specific environment-variable documentation.
