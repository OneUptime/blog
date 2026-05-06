# Validation Summary: Best Practices for Backup and Disaster Recovery with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Compose
- Git-based stack deployment / GitOps updates

## Sources Consulted
- Portainer Documentation: Roles - https://docs.portainer.io/admin/user/roles
- Portainer Documentation: Manage access to environments - https://docs.portainer.io/sts/admin/environments/access
- Portainer Documentation: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer Documentation: Using your own SSL certificate with Portainer - https://docs.portainer.io/advanced/ssl
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: docker volume ls - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: docker image ls - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/

## Issues Found
- Practice 2 overstated that "all Portainer configurations" should live in Git and used outdated UI wording. I changed this to stack definitions and related configuration, updated the deployment method to **Git Repository**, and replaced **Auto Update** with current **GitOps updates** terminology from Portainer docs.
- Practice 3 described a Portainer role hierarchy using non-existent built-in roles like `developer` and `admin`. I replaced the example with an internal access model explicitly mapped to documented Portainer roles such as `Read-Only User`, `Standard User`, `Operator`, `Environment administrator`, and `Administrator`.
- Practice 4 included the Compose top-level `version: "3.8"` field. Docker now documents this field as obsolete, so I removed it.
- Practice 7 claimed to configure structured logging while using the `json-file` driver and included an unsupported `tag` option for that driver. I changed the text to focus on log rotation and replaced `tag` with the supported `compress` option.
- Practice 8 used a fixed timestamp, relied on `echo "\n"` for formatting, mislabeled dangling images as images without containers, and labeled `docker system df -v` output as large volumes. I updated the script to use `printf`, generate the timestamp dynamically, renamed the image section to dangling images, and corrected the final heading to disk usage by object.
- Practice 9 used a non-documented `--ssl` flag, omitted essential Portainer runtime configuration, and referenced undefined secrets/volumes. I replaced `--ssl` with `--http-disabled`, kept the documented certificate and admin password flags, added the required port and volume mounts, and defined the secret and data volume so the Compose example is coherent.

## Review Notes
- The resource limits example uses the Compose Deploy Specification. Exact enforcement still depends on the target platform Portainer deploys to.
- The `--admin-password-file` flag in Portainer is only used when the admin account is first created.
- No additional technical issues found after the corrections above.
