# Validation Summary: Best Practices for Volume Management in Portainer - Volumes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Docker volumes
- Docker CLI

## Sources Consulted
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, Roles: https://docs.portainer.io/admin/user/roles
- Portainer Docs, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Docs, Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, JSON File logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs, docker volume ls: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs, docker system df: https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs, Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Docs, Secrets: https://docs.docker.com/reference/compose-file/secrets/

## Issues Found
- Practice 2 used outdated Portainer UI wording. I changed `Repository` to `Git Repository` and `Auto Update` to `GitOps updates` to match current Portainer terminology.
- Practice 3 described a custom role hierarchy as if it were Portainer's role model. I replaced it with Portainer Business Edition built-in roles and permissions based on the official RBAC documentation.
- Practice 4 used the top-level Compose `version: "3.8"` field. I removed it because Docker now treats `version` as obsolete and always validates against the latest schema.
- Practice 6 presented `deploy.resources` as universally applicable. I added a platform caveat because the Compose `deploy` section is optional and only applies where the target platform implements it.
- Practice 7 used `tag` under the `json-file` logging driver. I removed it because `tag` is not a supported `json-file` driver option in Docker's official documentation.
- Practice 8 used `echo "\n..."`, which is not portable shell behavior, hardcoded a date, mislabeled `dangling` images as "images without containers", and labeled `docker system df -v` as if it only reported large volumes. I changed the script to use `printf`, generate the date dynamically, and align the headings with what the commands actually return.
- Practice 9 used an invalid Portainer `--ssl` CLI flag and an incomplete Compose example for secrets and persistent Portainer data. I replaced `--ssl` with `--http-disabled`, added the persistent `/data` volume, and added the required top-level `secrets` and `volumes` definitions.

## Review Notes
- Portainer RBAC roles in Practice 3 are a Business Edition feature, so that section is edition-specific by design.
- The post title is volume-focused, but several practices are general Portainer and Docker operational guidance rather than volume-specific guidance.
- Several image references still use placeholder `:latest` tags. They are technically valid examples, but version-pinning would be a stronger operational practice for production material.
